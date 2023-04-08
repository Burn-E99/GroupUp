import { Bot, Embed, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { LFGMember } from '../../types/commandTypes.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { generateAlternateList, generateMemberList, generateMemberTitle, LfgEmbedIndexes, noMembersStr } from '../eventUtils.ts';
import utils from '../../utils.ts';

// Get Member Counts from the title
const getEventMemberCount = (rawMemberTitle: string): [number, number] => {
	const [rawCurrentCount, rawMaxCount] = rawMemberTitle.split('/');
	const currentMemberCount = parseInt(rawCurrentCount.split(':')[1] || '0');
	const maxMemberCount = parseInt(rawMaxCount || '0');
	return [currentMemberCount, maxMemberCount];
};

// Get LFGMember objects from string list
const getLfgMembers = (rawMemberList: string): Array<LFGMember> =>
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

const noEdit = async (bot: Bot, interaction: Interaction) =>
	bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredUpdateMessage,
	}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts', interaction, e));

// Remove member from the event
export const removeMemberFromEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, userId: bigint) => {
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

				// Notify member of promotion
				// TODO: send notification
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
export const joinMemberToEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, member: LFGMember) => {
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
		}
	} else {
		// No fields, can't join
		await somethingWentWrong(bot, interaction, 'noFieldsInJoinMember');
	}
};