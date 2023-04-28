import { ActionRow, ApplicationCommandFlags, Bot, ButtonStyles, Embed, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { LFGMember, UrlIds } from '../../types/commandTypes.ts';
import { infoColor1, safelyDismissMsg, sendDirectMessage, somethingWentWrong, successColor } from '../../commandUtils.ts';
import { generateAlternateList, generateMemberList, generateMemberTitle, idSeparator, leaveEventBtnStr, LfgEmbedIndexes, noMembersStr, pathIdxSeparator } from '../eventUtils.ts';
import { selfDestructMessage } from '../tokenCleanup.ts';
import { approveStr, customId as joinRequestCustomId, denyStr } from './joinRequest.ts';
import { customId as updateEventCustomId } from './updateEvent.ts';
import { customId as leaveViaDMCustomId } from './leaveViaDM.ts';
import { dbClient, queries } from '../../db.ts';
import utils from '../../utils.ts';

// Join status map to prevent spamming the system
export enum JoinRequestStatus {
	Pending = 'Pending',
	Approved = 'Approved',
	Denied = 'Denied',
}
export const generateMapId = (messageId: bigint, channelId: bigint, userId: bigint) => `${messageId}-${channelId}-${userId}`;
export const joinRequestMap: Map<string, {
	status: JoinRequestStatus;
	timestamp: number;
}> = new Map();

// Join request map cleaner
const oneHour = 1000 * 60 * 60;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;
setInterval(() => {
	const now = new Date().getTime();
	joinRequestMap.forEach((joinRequest, key) => {
		switch (joinRequest.status) {
			case JoinRequestStatus.Approved:
				// Delete Approved when over 1 hour old
				if (joinRequest.timestamp > now - oneHour) {
					joinRequestMap.delete(key);
				}
				break;
			case JoinRequestStatus.Pending:
				// Delete Pending when over 1 day old
				if (joinRequest.timestamp > now - oneDay) {
					joinRequestMap.delete(key);
				}
				break;
			case JoinRequestStatus.Denied:
				// Delete Rejected when over 1 week old
				if (joinRequest.timestamp > now - oneWeek) {
					joinRequestMap.delete(key);
				}
				break;
		}
	});
	// Run cleaner every hour
}, oneHour);

// Get Member Counts from the title
export const getEventMemberCount = (rawMemberTitle: string): [number, number] => {
	const [rawCurrentCount, rawMaxCount] = rawMemberTitle.split('/');
	const currentMemberCount = parseInt(rawCurrentCount.split(':')[1] || '0');
	const maxMemberCount = parseInt(rawMaxCount || '0');
	return [currentMemberCount, maxMemberCount];
};

// Get LFGMember objects from string list
export const getLfgMembers = (rawMemberList: string): Array<LFGMember> =>
	rawMemberList.trim() === noMembersStr ? [] : rawMemberList.split('\n').map((rawMember) => {
		const [memberName, memberMention] = rawMember.split('-');
		const lfgMember: LFGMember = {
			id: BigInt(memberMention.split('<@')[1].split('>')[0].trim() || '0'),
			name: memberName.trim(),
			joined: rawMember.endsWith('*'),
		};
		return lfgMember;
	});

// Remove LFGMember from array filter
const removeLfgMember = (memberList: Array<LFGMember>, memberId: bigint): Array<LFGMember> => memberList.filter((member) => member.id !== memberId);

// Handles updating the fields and editing the event
const editEvent = async (
	bot: Bot,
	interaction: Interaction,
	evtMessageEmbed: Embed,
	evtMessageId: bigint,
	evtChannelId: bigint,
	memberList: Array<LFGMember>,
	maxMemberCount: number,
	alternateList: Array<LFGMember>,
	loudAcknowledge: boolean,
) => {
	if (evtMessageEmbed.fields) {
		// Update the fields
		evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name = generateMemberTitle(memberList, maxMemberCount);
		evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value = generateMemberList(memberList);
		evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value = generateAlternateList(alternateList);

		// Edit the event
		await bot.helpers.editMessage(evtChannelId, evtMessageId, {
			embeds: [evtMessageEmbed],
		}).then(() => {
			// Let discord know we didn't ignore the user
			if (loudAcknowledge) {
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: successColor,
							title: 'Event Updated',
							description: `The action requested was completed successfully.

${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));
			} else {
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));
			}
		}).catch((e: Error) => {
			// Edit failed, try to notify user
			utils.commonLoggers.messageEditError('utils.ts', 'event edit fail', e);
			somethingWentWrong(bot, interaction, 'editFailedInUpdateEvent');
		});
	}
};

// Generic no response response
const noEdit = async (bot: Bot, interaction: Interaction, loudAcknowledge: boolean) => {
	if (loudAcknowledge) {
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					color: infoColor1,
					title: 'No Changes Made',
					description: `The action requested was not performed as it was not necessary.

${safelyDismissMsg}`,
				}],
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));
	} else {
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.DeferredUpdateMessage,
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));
	}
};

// Get Guild Name
export const getGuildName = async (bot: Bot, guildId: bigint): Promise<string> =>
	(await bot.helpers.getGuild(guildId).catch((e: Error) => utils.commonLoggers.messageGetError('utils.ts', 'get guild', e)) || { name: 'failed to get guild name' }).name;

// Remove member from the event
export const removeMemberFromEvent = async (
	bot: Bot,
	interaction: Interaction,
	evtMessageEmbed: Embed,
	evtMessageId: bigint,
	evtChannelId: bigint,
	userId: bigint,
	evtGuildId: bigint,
	loudAcknowledge = false,
): Promise<boolean> => {
	if (evtMessageEmbed.fields) {
		// Get old counts
		const [oldMemberCount, maxMemberCount] = getEventMemberCount(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name);
		// Remove user from event
		const oldMemberList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value);
		const memberList = removeLfgMember(oldMemberList, userId);
		const oldAlternateList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value);
		let alternateList = removeLfgMember(oldAlternateList, userId);

		// Check if user actually left event
		if (oldMemberList.length !== memberList.length || oldAlternateList.length !== alternateList.length) {
			// Check if we need to auto-promote a member
			const memberToPromote = alternateList.find((member) => member.joined);
			if (oldMemberCount !== memberList.length && oldMemberCount === maxMemberCount && memberToPromote) {
				// Promote member
				alternateList = removeLfgMember(alternateList, memberToPromote.id);
				memberList.push(memberToPromote);

				const urlIds: UrlIds = {
					guildId: evtGuildId,
					channelId: evtChannelId,
					messageId: evtMessageId,
				};

				// Notify member of promotion
				await sendDirectMessage(bot, memberToPromote.id, {
					embeds: [{
						color: successColor,
						title: 'Good news, you\'ve been promoted!',
						description: `A member left [the full event](${utils.idsToMessageUrl(urlIds)}) in \`${await getGuildName(
							bot,
							evtGuildId,
						)}\` you tried to join, leaving space for me to promote you from the alternate list to the joined list.\n\nPlease verify the event details below.  If you are no longer available for this event, please click on the '${leaveEventBtnStr}' button below`,
						fields: [
							evtMessageEmbed.fields[LfgEmbedIndexes.Activity],
							evtMessageEmbed.fields[LfgEmbedIndexes.StartTime],
							evtMessageEmbed.fields[LfgEmbedIndexes.ICSLink],
						],
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.Button,
							label: leaveEventBtnStr,
							style: ButtonStyles.Danger,
							customId: `${leaveViaDMCustomId}${idSeparator}${evtGuildId}${pathIdxSeparator}${evtChannelId}${pathIdxSeparator}${evtMessageId}`,
						}],
					}],
				}).catch((e: Error) => utils.commonLoggers.messageSendError('utils.ts', 'user promotion dm', e));
			}

			// Update the event
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList, loudAcknowledge);
			return true;
		} else {
			// Send noEdit response because user did not actually leave
			await noEdit(bot, interaction, loudAcknowledge);
			return false;
		}
	} else {
		await somethingWentWrong(bot, interaction, 'noFieldsInRemoveMember');
		return false;
	}
};

// Alternate member to the event
export const alternateMemberToEvent = async (
	bot: Bot,
	interaction: Interaction,
	evtMessageEmbed: Embed,
	evtMessageId: bigint,
	evtChannelId: bigint,
	member: LFGMember,
	userJoinOnFull = false,
	loudAcknowledge = false,
): Promise<boolean> => {
	if (evtMessageEmbed.fields) {
		member.joined = userJoinOnFull;
		// Get current alternates
		let alternateList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value);

		// Verify user is not already on the alternate list
		if (!alternateList.find((alternateMember) => alternateMember.id === member.id && alternateMember.joined === member.joined)) {
			// Add user to event, remove first to update joined status if necessary
			alternateList = removeLfgMember(alternateList, member.id);
			alternateList.push(member);

			// Get member count and remove user from joined list (if they are there)
			const [_oldMemberCount, maxMemberCount] = getEventMemberCount(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name);
			const memberList = removeLfgMember(getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value), member.id);

			// Update the event
			evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value = generateAlternateList(alternateList);
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList, loudAcknowledge);
			return true;
		} else {
			// Send noEdit response because user was already an alternate and joined status did not change
			await noEdit(bot, interaction, loudAcknowledge);
			return false;
		}
	} else {
		// No fields, can't alternate
		await somethingWentWrong(bot, interaction, 'noFieldsInAlternateMember');
		return false;
	}
};

// Join member to the event
export const joinMemberToEvent = async (
	bot: Bot,
	interaction: Interaction,
	evtMessageEmbed: Embed,
	evtMessageId: bigint,
	evtChannelId: bigint,
	member: LFGMember,
	evtGuildId: bigint,
	loudAcknowledge = false,
): Promise<boolean> => {
	if (evtMessageEmbed.fields) {
		// Get current member list and count
		const [oldMemberCount, maxMemberCount] = getEventMemberCount(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name);
		const memberList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value);
		// Verify user is not already on the joined list
		if (memberList.find((joinedMember) => joinedMember.id === member.id)) {
			// Send noEdit response because user was already joined
			await noEdit(bot, interaction, loudAcknowledge);
			return false;
		} else if (oldMemberCount === maxMemberCount) {
			// Event full, add member to alternate list
			return await alternateMemberToEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, member, true, loudAcknowledge);
		} else {
			// Join member to event
			memberList.push(member);

			// Remove user from alternate list (if they are there)
			const alternateList = removeLfgMember(getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value), member.id);

			// Update the event
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList, loudAcknowledge);

			// Check if we need to notify the owner that their event has filled
			if (memberList.length === maxMemberCount) {
				dbClient.execute(queries.callIncCnt('lfg-filled')).catch((e) => utils.commonLoggers.dbError('utils.ts@lfg-filled', 'call sproc INC_CNT on', e));
				const urlIds: UrlIds = {
					guildId: evtGuildId,
					channelId: evtChannelId,
					messageId: evtMessageId,
				};
				const guildName = await getGuildName(bot, evtGuildId);
				// Notify member of promotion
				await sendDirectMessage(bot, BigInt(evtMessageEmbed.footer?.iconUrl?.split('#')[1] || '0'), {
					embeds: [{
						color: successColor,
						title: `Good news, your event in ${guildName} has filled!`,
						description: `[Click here](${utils.idsToMessageUrl(urlIds)}) to view the event in ${guildName}.`,
						fields: evtMessageEmbed.fields,
					}],
				}).catch((e: Error) => utils.commonLoggers.messageSendError('utils.ts', 'event filled dm', e));
			}
			return true;
		}
	} else {
		// No fields, can't join
		await somethingWentWrong(bot, interaction, 'noFieldsInJoinMember');
		return false;
	}
};

// Join Request Approve/Deny Buttons
export const joinRequestResponseButtons = (disabled: boolean): ActionRow[] => [{
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		label: 'Approve Request',
		style: ButtonStyles.Success,
		customId: `${joinRequestCustomId}${idSeparator}${approveStr}`,
		disabled,
	}, {
		type: MessageComponentTypes.Button,
		label: 'Deny Request',
		style: ButtonStyles.Danger,
		customId: `${joinRequestCustomId}${idSeparator}${denyStr}`,
		disabled,
	}],
}];

export const applyEditButtonName = 'Apply Edit';
export const applyEditMessage = (currentTime: number) =>
	`Please verify the updated event below, then click on the \`${applyEditButtonName}\` button.  If this does not look right, please dismiss this message and start over.\n\n${
		selfDestructMessage(currentTime)
	}`;
export const applyEditButtons = (idxPath: string): ActionRow[] => [{
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		label: applyEditButtonName,
		style: ButtonStyles.Success,
		customId: `${updateEventCustomId}${idSeparator}${idxPath}`,
	}],
}];
