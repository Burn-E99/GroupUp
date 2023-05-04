import { Bot, Interaction } from '../../deps.ts';
import utils from '../utils.ts';

// Discord Interaction Tokens last 15 minutes, we will self kill after 14.5 minutes
const tokenTimeoutS = (15 * 60) - 30;
const tokenTimeoutMS = tokenTimeoutS * 1000;
export const selfDestructMessage = (currentTime: number) =>
	`**Please note:** This message will self destruct <t:${Math.floor((currentTime + tokenTimeoutMS) / 1000)}:R> due to limits imposed by the Discord API.`;

export const tokenMap: Map<string, {
	token: string;
	timeoutId: number;
}> = new Map();

export const generateMapId = (guildId: bigint, channelId: bigint, userId: bigint) => `${guildId}-${channelId}-${userId}`;

export const addTokenToMap = (bot: Bot, interaction: Interaction, guildId: bigint, channelId: bigint, userId: bigint) =>
	tokenMap.set(generateMapId(guildId, channelId, userId), {
		token: interaction.token,
		timeoutId: setTimeout(
			(guildId, channelId, userId) => {
				deleteTokenEarly(bot, interaction, guildId, channelId, userId).catch((e) => utils.commonLoggers.interactionSendError('tokenCleanup.ts:addTokenToMap', interaction, e));
			},
			tokenTimeoutMS,
			guildId,
			channelId,
			userId,
		),
	});

export const deleteTokenEarly = async (bot: Bot, interaction: Interaction, guildId: bigint, channelId: bigint, userId: bigint) => {
	const tokenMapEntry = tokenMap.get(generateMapId(guildId, channelId, userId));
	if (tokenMapEntry?.token) {
		await bot.helpers.deleteOriginalInteractionResponse(tokenMap.get(generateMapId(guildId, channelId, userId))?.token ?? '').catch((e: Error) =>
			utils.commonLoggers.interactionSendError('tokenCleanup.ts:deleteTokenEarly', interaction, e)
		);
		clearTimeout(tokenMapEntry.timeoutId);
		tokenMap.delete(generateMapId(guildId, channelId, userId));
	}
};
