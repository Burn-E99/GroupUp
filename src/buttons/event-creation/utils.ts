import { Activity } from './activities.ts';
import { ActionRow, Bot, Interaction, MessageComponentTypes, SelectOption } from '../../../deps.ts';
import utils from '../../utils.ts';

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
