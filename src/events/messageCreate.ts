import config from '../../config.ts';
import { Bot, botId, Message } from '../../deps.ts';

export const messageCreate = async (bot: Bot, message: Message) => {
	// Ignore all messages that are not commands
	if (message.content.indexOf(config.prefix) !== 0) {
		// Handle @bot messages
		if (message.mentionedUserIds[0] === botId && (message.content.trim().startsWith(`<@${botId}>`) || message.content.trim().startsWith(`<@!${botId}>`))) {
		}

		// return as we are done handling this command
		return;
	}

	// Ignore all other bots
	if (message.isFromBot) return;
};
