import { CreateMessage, Interaction, log, LT, Message } from '../deps.ts';
import { UrlIds } from './types/commandTypes.ts';

// deno-lint-ignore no-explicit-any
const jsonStringifyBig = (input: any) => {
	return JSON.stringify(input, (_key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value);
};

// Get/Generate Discord Message URL
const idsToMessageUrl = (ids: UrlIds) => `https://discord.com/channels/${ids.guildId}/${ids.channelId}/${ids.messageId}`;
const messageUrlToIds = (url: string): UrlIds => {
	url = url.toLowerCase();
	const [guildId, channelId, messageId] = (url.split('channels/')[1] || '').split('/');

	return {
		guildId: BigInt(guildId || '0'),
		channelId: BigInt(channelId || '0'),
		messageId: BigInt(messageId || '0'),
	};
};

const capitalizeFirstChar = (input: string) => `${input.charAt(0).toUpperCase()}${input.slice(1)}`;

const interactionSendError = (location: string, interaction: Interaction | string, err: Error) =>
	log(LT.ERROR, `${location} | Failed to respond to interaction: ${jsonStringifyBig(interaction)} | Error: ${err.name} - ${err.message}`);
const messageEditError = (location: string, message: Message | string, err: Error) =>
	log(LT.ERROR, `${location} | Failed to edit message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageGetError = (location: string, message: Message | string, err: Error) =>
	log(LT.ERROR, `${location} | Failed to get message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageSendError = (location: string, message: Message | CreateMessage | string, err: Error) =>
	log(LT.ERROR, `${location} | Failed to send message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageDeleteError = (location: string, message: Message | string, err: Error) =>
	log(LT.ERROR, `${location} | Failed to delete message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const reactionAddError = (location: string, message: Message | string, err: Error, emoji: string) =>
	log(LT.ERROR, `${location} | Failed to add emoji (${emoji}) to message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const reactionDeleteError = (location: string, message: Message | string, err: Error, emoji: string) =>
	log(LT.ERROR, `${location} | Failed to delete emoji (${emoji}) from message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const channelUpdateError = (location: string, message: string, err: Error) => log(LT.ERROR, `${location} | Failed to update channel | ${message} | Error: ${err.name} - ${err.message}`);

const dbError = (location: string, type: string, err: Error) => log(LT.ERROR, `${location} | Failed to ${type} database | Error: ${err.name} - ${err.message}`);

export default {
	capitalizeFirstChar,
	commonLoggers: {
		channelUpdateError,
		dbError,
		interactionSendError,
		messageGetError,
		messageEditError,
		messageSendError,
		messageDeleteError,
		reactionAddError,
		reactionDeleteError,
	},
	jsonStringifyBig,
	messageUrlToIds,
	idsToMessageUrl,
};
