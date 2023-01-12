import { Interaction, log, LT, Message } from '../deps.ts';

const jsonStringifyBig = (input: any) => {
	return JSON.stringify(input, (_key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value);
};

const genericLogger = (level: LT, message: string) => log(level, message);
const interactionSendError = (location: string, interaction: Interaction | string, err: Error) =>
	genericLogger(LT.ERROR, `${location} | Failed to respond to interaction: ${jsonStringifyBig(interaction)} | Error: ${err.name} - ${err.message}`);
const messageEditError = (location: string, message: Message | string, err: Error) =>
	genericLogger(LT.ERROR, `${location} | Failed to edit message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageGetError = (location: string, message: Message | string, err: Error) =>
	genericLogger(LT.ERROR, `${location} | Failed to get message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageSendError = (location: string, message: Message | string, err: Error) =>
	genericLogger(LT.ERROR, `${location} | Failed to send message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const messageDeleteError = (location: string, message: Message | string, err: Error) =>
	genericLogger(LT.ERROR, `${location} | Failed to delete message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const reactionAddError = (location: string, message: Message | string, err: Error, emoji: string) =>
	genericLogger(LT.ERROR, `${location} | Failed to add emoji (${emoji}) to message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const reactionDeleteError = (location: string, message: Message | string, err: Error, emoji: string) =>
	genericLogger(LT.ERROR, `${location} | Failed to delete emoji (${emoji}) from message: ${jsonStringifyBig(message)} | Error: ${err.name} - ${err.message}`);
const dbError = (location: string, type: string, err: Error) => genericLogger(LT.ERROR, `${location} | Failed to ${type} database | Error: ${err.name} - ${err.message}`);

export default {
	commonLoggers: {
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
};
