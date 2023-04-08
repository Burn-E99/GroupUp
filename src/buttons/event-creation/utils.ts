import {
	ActionRow,
	ApplicationCommandFlags,
	Bot,
	ButtonComponent,
	ButtonStyles,
	Interaction,
	InteractionResponse,
	InteractionResponseTypes,
	MessageComponentTypes,
	SelectOption,
} from '../../../deps.ts';
import config from '../../../config.ts';
import utils from '../../utils.ts';
import { Activity } from './activities.ts';
import { generateAlternateList, generateMemberList, generateMemberTitle, idSeparator, leaveEventBtnStr, lfgStartTimeName } from '../eventUtils.ts';
import { successColor } from '../../commandUtils.ts';
import { LFGMember } from '../../types/commandTypes.ts';
import { customId as gameSelCustomId } from './step1-gameSelection.ts';
import { customId as createEventCustomId } from './step3-createEvent.ts';
import { customId as joinEventCustomId } from '../live-event/joinEvent.ts';
import { customId as leaveEventCustomId } from '../live-event/leaveEvent.ts';
import { customId as alternateEventCustomId } from '../live-event/alternateEvent.ts';

// Discord Interaction Tokens last 15 minutes, we will self kill after 14.5 minutes
const tokenTimeoutS = (15 * 60) - 30;
export const tokenTimeoutMS = tokenTimeoutS * 1000;
export const pathIdxSeparator = '|';
export const pathIdxEnder = '&';
export const selfDestructMessage = (currentTime: number) =>
	`**Please note:** This message will self destruct <t:${Math.floor((currentTime + tokenTimeoutMS) / 1000)}:R> due to limits imposed by the Discord API.`;

export const tokenMap: Map<string, {
	token: string;
	timeoutId: number;
}> = new Map();

export const getNestedActivity = (idxPath: Array<number>, activities: Array<Activity>): Array<Activity> => {
	const nextIdx = idxPath[0];
	if (idxPath.length && activities[nextIdx] && activities[nextIdx].options) {
		idxPath.shift();
		return getNestedActivity(idxPath, activities[nextIdx].options || []);
	} else {
		return activities;
	}
};

export const getFinalActivity = (idxPath: Array<number>, activities: Array<Activity>): Activity => getNestedActivity(idxPath, activities)[idxPath[idxPath.length - 1]];

const getSelectOptions = (baseValue: string, activities: Array<Activity>, defaultIdx?: number): Array<SelectOption> =>
	activities.map((act, idx) => ({
		label: act.name,
		value: `${baseValue}${idx}${act.maxMembers ? pathIdxEnder : pathIdxSeparator}`,
		default: idx === defaultIdx,
	}));

export const generateActionRow = (baseValue: string, activities: Array<Activity>, customId: string, defaultIdx?: number): ActionRow => ({
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.SelectMenu,
		customId,
		options: getSelectOptions(baseValue, activities, defaultIdx),
	}],
});

export const generateMapId = (guildId: bigint, channelId: bigint, userId: bigint) => `${guildId}-${channelId}-${userId}`;

export const addTokenToMap = (bot: Bot, interaction: Interaction, guildId: bigint, channelId: bigint, userId: bigint) =>
	tokenMap.set(generateMapId(guildId, channelId, userId), {
		token: interaction.token,
		timeoutId: setTimeout(
			(guildId, channelId, userId) => {
				deleteTokenEarly(bot, interaction, guildId, channelId, userId);
			},
			tokenTimeoutMS,
			guildId,
			channelId,
			userId,
		),
	});

export const deleteTokenEarly = async (bot: Bot, interaction: Interaction, guildId: bigint, channelId: bigint, userId: bigint) => {
	const tokenMapEntry = tokenMap.get(generateMapId(guildId, channelId, userId));
	if (tokenMapEntry && tokenMapEntry.token) {
		await bot.helpers.deleteOriginalInteractionResponse(tokenMap.get(generateMapId(guildId, channelId, userId))?.token || '').catch((e: Error) =>
			utils.commonLoggers.interactionSendError('utils.ts:deleteTokenEarly', interaction, e)
		);
		clearTimeout(tokenMapEntry.timeoutId);
		tokenMap.delete(generateMapId(guildId, channelId, userId));
	}
};

const createEventBtnName = 'Create Event';
const createWhitelistedBtnName = 'Create Whitelisted Event';
const editEventDetailsBtnName = 'Edit Event Details';
const finalizeButtons = (idxPath: string): [ButtonComponent, ButtonComponent, ButtonComponent] => [{
	type: MessageComponentTypes.Button,
	label: createEventBtnName,
	style: ButtonStyles.Success,
	customId: createEventCustomId,
}, {
	type: MessageComponentTypes.Button,
	label: createWhitelistedBtnName,
	style: ButtonStyles.Primary,
	customId: `${createEventCustomId}${idSeparator}`,
}, {
	type: MessageComponentTypes.Button,
	label: editEventDetailsBtnName,
	style: ButtonStyles.Secondary,
	customId: `${gameSelCustomId}${idSeparator}${idxPath}${pathIdxEnder}`,
}];

export const generateLFGButtons = (whitelist: boolean): [ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent] => [{
	type: MessageComponentTypes.Button,
	label: `${whitelist ? 'Request to ' : ''}Join`,
	style: ButtonStyles.Success,
	customId: `${joinEventCustomId}${whitelist ? idSeparator : ''}`,
}, {
	type: MessageComponentTypes.Button,
	label: leaveEventBtnStr,
	style: ButtonStyles.Danger,
	customId: leaveEventCustomId,
}, {
	type: MessageComponentTypes.Button,
	label: `Join as Alternate`,
	style: ButtonStyles.Primary,
	customId: alternateEventCustomId,
}, {
	type: MessageComponentTypes.Button,
	label: '',
	style: ButtonStyles.Secondary,
	customId: 'editEvent', // TODO: replace with proper id
	emoji: {
		name: '✏️',
	},
}, {
	type: MessageComponentTypes.Button,
	label: '',
	style: ButtonStyles.Secondary,
	customId: 'deleteEvent', // TODO: replace with proper id
	emoji: {
		name: '🗑️',
	},
}];

export const createLFGPost = (
	category: string,
	activity: Activity,
	eventDateTime: Date,
	eventDateTimeStr: String,
	eventDescription: string,
	authorId: bigint,
	author: string,
	memberList: Array<LFGMember>,
	alternateList: Array<LFGMember>,
	idxPath: string,
	editing: boolean,
	whitelist = false,
): InteractionResponse => {
	const icsDetails = `${category}: ${activity.name}`;
	return {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: editing ? ApplicationCommandFlags.Ephemeral : undefined,
			content: editing
				? `Please verify the information below, then click on the \`${createEventBtnName}\` or \`${createWhitelistedBtnName}\` button, or change the event \`Date/Time\` or \`Description\` with the ${editEventDetailsBtnName} button below. \n\n${
					selfDestructMessage(new Date().getTime())
				}`
				: '',
			embeds: [{
				color: successColor,
				fields: [{
					name: `${category}:`,
					value: activity.name,
					inline: true,
				}, {
					name: lfgStartTimeName,
					value: `${eventDateTimeStr}\n<t:${Math.floor(eventDateTime.getTime() / 1000)}:R>`,
					inline: true,
				}, {
					name: 'Add to Calendar:',
					value: `[Download ICS File](${config.links.addToCalendar}?t=${eventDateTime.getTime()}&n=${icsDetails.replaceAll(' ', '+')})`,
					inline: true,
				}, {
					name: 'Description:',
					value: eventDescription,
				}, {
					name: generateMemberTitle(memberList, activity.maxMembers || 0),
					value: generateMemberList(memberList),
					inline: true,
				}, {
					name: 'Alternates:',
					value: generateAlternateList(alternateList),
					inline: true,
				}],
				footer: {
					text: `Created by: ${author}`,
					iconUrl: `${config.links.creatorIcon}#${authorId}`,
				},
				timestamp: eventDateTime.getTime(),
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: editing ? finalizeButtons(idxPath) : generateLFGButtons(whitelist),
			}],
		},
	};
};
