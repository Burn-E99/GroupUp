import { Bot, Embed, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { LFGMember } from '../../types/commandTypes.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { generateAlternateList, generateMemberList, generateMemberTitle, LfgEmbedIndexes, noMembersStr } from '../eventUtils.ts';
import utils from '../../utils.ts';

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
export const removeLfgMember = (memberList: Array<LFGMember>, memberId: bigint): Array<LFGMember> => memberList.filter((member) => member.id !== memberId);

// Remove member from the event
export const removeMemberFromEvent = (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, userId: bigint) => {
	if (evtMessageEmbed.fields) {
		// Remove user from event
		const [oldMemberCount, maxMemberCount] = getEventMemberCount(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name);
		const memberList = removeLfgMember(getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value), userId);
		let alternateList = removeLfgMember(getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value), userId);

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
		evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].name = generateMemberTitle(memberList, maxMemberCount);
		evtMessageEmbed.fields[LfgEmbedIndexes.JoinedMembers].value = generateMemberList(memberList);
		evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value = generateAlternateList(alternateList);
		bot.helpers.editMessage(evtChannelId, evtMessageId, {
			embeds: [evtMessageEmbed],
		}).then(() => {
			// Let discord know we didn't ignore the user
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts@removeEvent', interaction, e));
		}).catch((e: Error) => {
			// Edit failed, try to notify user
			utils.commonLoggers.messageEditError('utils.ts@removeEvent', 'remove edit fail', e);
			somethingWentWrong(bot, interaction, 'editFailedInRemoveMember');
		});
	} else {
		somethingWentWrong(bot, interaction, 'noFieldsInRemoveMember');
	}
};

// Alternate member to the event
export const alternateMemberToEvent = async (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, member: LFGMember, userJoinOnFull = false) => {
	if (evtMessageEmbed.fields) {
		// Add user to the event
		member.joined = userJoinOnFull;
		const alternateList = getLfgMembers(evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value);
		alternateList.push(member);

		// Update the event
		evtMessageEmbed.fields[LfgEmbedIndexes.AlternateMembers].value = generateAlternateList(alternateList);
		bot.helpers.editMessage(evtChannelId, evtMessageId, {
			embeds: [evtMessageEmbed],
		}).then(() => {
			// Let discord know we didn't ignore the user
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('utils.ts@alternateEvent', interaction, e));
		}).catch((e: Error) => {
			// Edit failed, try to notify user
			utils.commonLoggers.messageEditError('utils.ts@alternateEvent', 'alternate edit fail', e);
			somethingWentWrong(bot, interaction, 'editFailedInAlternateMember');
		});
	} else {
		// No fields, can't alternate
		somethingWentWrong(bot, interaction, 'noFieldsInAlternateMember');
	}
};

// Join member to the event
export const joinMemberToEvent = (bot: Bot, interaction: Interaction, evtMessageEmbed: Embed, evtMessageId: bigint, evtChannelId: bigint, member: LFGMember) => {
	if (evtMessageEmbed.fields) {
	} else {
		somethingWentWrong(bot, interaction, 'noFieldsInJoinMember');
	}
};
