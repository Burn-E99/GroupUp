import { Activity } from './activities.ts';
import { ActionRow, Bot, Interaction, MessageComponentTypes, SelectOption } from '../../../deps.ts';
import utils from '../../utils.ts';

// Discord Interaction Tokens last 15 minutes, we will self kill after 14.5 minutes
const tokenTimeoutS = (15 * 60) - 30;
export const tokenTimeoutMS = tokenTimeoutS * 1000;
export const idSeparator = '@';
export const pathIdxSeparator = '|';
export const pathIdxEnder = '&';
export const selfDestructMessage = (currentTime: number) => `**Please note:** This message will self destruct <t:${Math.floor((currentTime + tokenTimeoutMS) / 1000)}:R> due to limits imposed by the Discord API.`;
export const tzMap: Map<string, string> = new Map([
	['CDT', '-05:00'],
	['CST', '-06:00'],
	['PST', '-08:00'],
	['IST', '+05:30'],
	['GMT', '+00:00'],
	['EAT', '+03:00'],
	['CET', '+01:00'],
	['WAT', '+01:00'],
	['CAT', '+02:00'],
	['EET', '+02:00'],
	['CEST', '+02:00'],
	['SAST', '+02:00'],
	['HST', '-10:00'],
	['HDT', '-09:00'],
	['AKST', '-09:00'],
	['AKDT', '-08:00'],
	['AST', '-04:00'],
	['EST', '-05:00'],
	['MST', '-07:00'],
	['MDT', '-06:00'],
	['EDT', '-04:00'],
	['PDT', '-07:00'],
	['ADT', '-03:00'],
	['NST', '-03:30'],
	['NDT', '-02:30'],
	['AEST', '+10:00'],
	['AEDT', '+11:00'],
	['NZST', '+12:00'],
	['NZDT', '+13:00'],
	['EEST', '+03:00'],
	['HKT', '+08:00'],
	['WIB', '+07:00'],
	['WIT', '+09:00'],
	['IDT', '+03:00'],
	['PKT', '+05:00'],
	['WITA', '+08:00'],
	['KST', '+09:00'],
	['JST', '+09:00'],
	['WET', '+00:00'],
	['WEST', '+01:00'],
	['ACST', '+09:30'],
	['ACDT', '+10:30'],
	['AWST', '+08:00'],
	['UTC', '+00:00'],
	['BST', '+01:00'],
	['MSK', '+03:00'],
	['MET', '+01:00'],
	['MEST', '+02:00'],
	['CHST', '+10:00'],
	['SST', '-11:00'],
]);

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

export const addTokenToMap = (bot: Bot, interaction: Interaction, guildId: bigint, channelId: bigint, userId: bigint) => tokenMap.set(generateMapId(guildId, channelId, userId), {
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
