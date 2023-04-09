import { ActionRow, Bot, ButtonStyles, Embed, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { LFGMember, UrlIds } from '../../types/commandTypes.ts';
import { sendDirectMessage, somethingWentWrong, successColor } from '../../commandUtils.ts';
import { generateAlternateList, generateMemberList, generateMemberTitle, leaveEventBtnStr, LfgEmbedIndexes, noMembersStr } from '../eventUtils.ts';
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
const getEventMemberCount = (rawMemberTitle: string): [number, number] => {
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
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));
		}).catch((e: Error) => {
			// Edit failed, try to notify user
			utils.commonLoggers.messageEditError('utils.ts', 'event edit fail', e);
			somethingWentWrong(bot, interaction, 'editFailedInUpdateEvent');
		});
	}
};

// Generic no response response
const noEdit = async (bot: Bot, interaction: Interaction) =>
	bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredUpdateMessage,
	}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));

// Get Guild Name
export const getGuildName = async (bot: Bot, guildId: bigint): Promise<string> =>
	(await bot.helpers.getGuild(guildId).catch((e: Error) => utils.commonLoggers.messageGetError('utils.ts', 'get guild', e)) || { name: 'failed to get guild name' }).name;

// Remove member from the event
export const removeMemberFromEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, userId: bigint, evtGuildId: bigint) => {
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
							customId: 'leaveEventCustomId', // TODO: fix
						}],
					}],
				}).catch((e: Error) => utils.commonLoggers.messageSendError('utils.ts', 'user promotion dm', e));
			}

			// Update the event
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList);
		} else {
			// Send noEdit response because user did not actually leave
			await noEdit(bot, interaction);
		}
	} else {
		await somethingWentWrong(bot, interaction, 'noFieldsInRemoveMember');
	}
};

// Alternate member to the event
export const alternateMemberToEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, member: LFGMember, userJoinOnFull = false) => {
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
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList);
		} else {
			// Send noEdit response because user was already an alternate and joined status did not change
			await noEdit(bot, interaction);
		}
	} else {
		// No fields, can't alternate
		await somethingWentWrong(bot, interaction, 'noFieldsInAlternateMember');
	}
};

// Join member to the event
export const joinMemberToEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, member: LFGMember, evtGuildId: bigint) => {
	if (evtMessageEmbed.fields) {
		// Get current member list and count
		const [oldMemberCount, maxMemberCount] = getEventMemberCount(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name);
		const memberList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value);
		// Verify user is not already on the joined list
		if (memberList.find((joinedMember) => joinedMember.id === member.id)) {
			// Send noEdit response because user was already joined
			await noEdit(bot, interaction);
		} else if (oldMemberCount === maxMemberCount) {
			// Event full, add member to alternate list
			await alternateMemberToEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, member, true);
		} else {
			// Join member to event
			memberList.push(member);

			// Remove user from alternate list (if they are there)
			const alternateList = removeLfgMember(getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value), member.id);

			// Update the event
			await editEvent(bot, interaction, evtMessageEmbed, evtMessageId, evtChannelId, memberList, maxMemberCount, alternateList);

			// Check if we need to notify the owner that their event has filled
			if (memberList.length === maxMemberCount) {
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
						description: `[Click here to view the event in ${guildName}.](${utils.idsToMessageUrl(urlIds)})`,
						fields: evtMessageEmbed.fields,
					}],
				}).catch((e: Error) => utils.commonLoggers.messageSendError('utils.ts', 'event filled dm', e));
			}
		}
	} else {
		// No fields, can't join
		await somethingWentWrong(bot, interaction, 'noFieldsInJoinMember');
	}
};

// Join Request Approve/Deny Buttons
export const joinRequestResponseButtons = (disabled: boolean): ActionRow[] => [{
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		label: 'Approve Request',
		style: ButtonStyles.Success,
		customId: 'approveJoinRequestCustomId', // TODO: fix
		disabled,
	}, {
		type: MessageComponentTypes.Button,
		label: 'Deny Request',
		style: ButtonStyles.Danger,
		customId: 'denyJoinRequestCustomId', // TODO: fix
		disabled,
	}],
}];
