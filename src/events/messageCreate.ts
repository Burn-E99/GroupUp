import config from '../../config.ts';
import utils from '../utils.ts';
import { Bot, botId, Message } from '../../deps.ts';
import { infoEmbed } from '../commandUtils.ts';
import { dbClient } from '../db/client.ts';
import { generateGuildSettingKey, lfgChannelSettings, queries } from '../db/common.ts';

export const messageCreate = (bot: Bot, message: Message) => {
	// Ignore self
	if (botId === message.authorId) return;

	// Delete all messages sent to a LFG Channel
	if (lfgChannelSettings.has(generateGuildSettingKey(message.guildId || 0n, message.channelId))) {
		bot.helpers.deleteMessage(message.channelId, message.id, 'Cleaning LFG Channel').catch((e: Error) => utils.commonLoggers.messageDeleteError('messageCreate.ts', 'Clean LFG Channel', e));
		return;
	}

	// Ignore all messages that are not commands
	if (message.content.indexOf(config.prefix) !== 0) {
		// Handle @bot messages
		if (message.mentionedUserIds[0] === botId && (message.content.trim().startsWith(`<@${botId}>`) || message.content.trim().startsWith(`<@!${botId}>`))) {
			dbClient.execute(queries.callIncCnt('msg-mention')).catch((e) => utils.commonLoggers.dbError('info.ts', 'call sproc INC_CNT on', e));
			bot.helpers.sendMessage(message.channelId, {
				embeds: [infoEmbed],
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
					failIfNotExists: false,
				},
			}).catch((e: Error) => utils.commonLoggers.messageSendError('messageCreate.ts', '@mention', e));
			return;
		}

		// return as we are done handling this command
		return;
	}

	// Ignore all other bots
	if (message.isFromBot) return;
};
