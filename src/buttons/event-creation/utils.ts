import config from '../../../config.ts';
import { Activity } from './activities.ts';
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
import utils from '../../utils.ts';
import { successColor } from '../../commandUtils.ts';
import { LFGMember } from '../../types/commandTypes.ts';
import { customId as gameSelCustomId } from './step1-gameSelection.ts';

// Discord Interaction Tokens last 15 minutes, we will self kill after 14.5 minutes
const tokenTimeoutS = (15 * 60) - 30;
export const tokenTimeoutMS = tokenTimeoutS * 1000;
export const idSeparator = '@';
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

const finalizeButtons = (idxPath: string): [ButtonComponent, ButtonComponent, ButtonComponent] => [{
	type: MessageComponentTypes.Button,
	label: 'Create Event',
	style: ButtonStyles.Success,
	customId: 'createEvent', // TODO: replace with proper id
}, {
	type: MessageComponentTypes.Button,
	label: 'Create Whitelisted Event',
	style: ButtonStyles.Primary,
	customId: `createEvent${idSeparator}`, // TODO: replace with proper id
}, {
	type: MessageComponentTypes.Button,
	label: 'Edit Event Details',
	style: ButtonStyles.Secondary,
	customId: `${gameSelCustomId}${idSeparator}${idxPath}${pathIdxEnder}`,
}];

export const generateLFGButtons = (whitelist: boolean): [ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent] => [{
	type: MessageComponentTypes.Button,
	label: `${whitelist ? 'Request to ' : ''}Join`,
	style: ButtonStyles.Success,
	customId: `joinEvent${whitelist ? idSeparator : ''}`, // TODO: replace with proper id
}, {
	type: MessageComponentTypes.Button,
	label: `Join as Alternate`,
	style: ButtonStyles.Primary,
	customId: 'alternateEvent', // TODO: replace with proper id
}, {
	type: MessageComponentTypes.Button,
	label: 'Leave',
	style: ButtonStyles.Danger,
	customId: 'leaveEvent', // TODO: replace with proper id
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

export enum LfgEmbedIndexes {
	Activity,
	StartTime,
	ICSLink,
	Description,
	JoinedMembers,
	AlternateMembers,
}
export const createLFGPost = (
	category: string,
	activity: Activity,
	eventDateTime: Date,
	eventDateTimeStr: String,
	eventDescription: string,
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
			flags: ApplicationCommandFlags.Ephemeral,
			content: editing ? 'Please verify the information below, then click on the $name button below' : 'test',
			embeds: [{
				color: successColor,
				fields: [{
					name: `${category}:`,
					value: activity.name,
					inline: true,
				}, {
					name: 'Start Time:',
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
					name: `Members Joined: ${memberList.length}/${activity.maxMembers}`,
					value: memberList.length ? memberList.map((member) => `${member.name} - <@${member.id}>`).join('\n') : 'None',
					inline: true,
				}, {
					name: 'Alternates:',
					value: alternateList.length ? alternateList.map((member) => `${member.name} - <@${member.id}>${member.joined ? ' *' : ''}`).join('\n') : 'None',
					inline: true,
				}],
				footer: {
					text: `Created by: ${author}`,
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
