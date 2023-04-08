import { ApplicationCommandFlags, Bot, CreateMessage, Interaction, InteractionResponseTypes } from '../deps.ts';
import config from '../config.ts';
import { lfgChannelSettings } from './db.ts';
import utils from './utils.ts';

export const failColor = 0xe71212;
export const warnColor = 0xe38f28;
export const successColor = 0x0f8108;
export const infoColor1 = 0x313bf9;
export const infoColor2 = 0x6805e9;

export const safelyDismissMsg = 'You may safely dismiss this message.';

export const getRandomStatus = (guildCount: number): string => {
	const statuses = [
		`Running V${config.version}`,
		`${config.prefix}info to learn more`,
		`Running LFGs in ${guildCount} servers`,
	];
	return statuses[Math.floor(Math.random() * statuses.length)];
};

export const isLFGChannel = (guildId: bigint, channelId: bigint) => {
	return (lfgChannelSettings.has(`${guildId}-${channelId}`) || channelId === 0n || guildId === 0n) ? ApplicationCommandFlags.Ephemeral : undefined;
};

export const somethingWentWrong = async (bot: Bot, interaction: Interaction, errorCode: string) =>
	bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				color: failColor,
				title: 'Something went wrong...',
				description: 'You should not be able to get here.  Please try again and if the issue continues, `/report` this issue to the developers with the error code below.',
				fields: [{
					name: 'Error Code:',
					value: errorCode,
				}],
			}],
		},
	}).catch((e: Error) => utils.commonLoggers.interactionSendError('commandUtils.ts', interaction, e));

// Send DM to User
export const sendDirectMessage = async (bot: Bot, userId: bigint, message: CreateMessage) =>
	bot.helpers.getDmChannel(userId).then((userDmChannel) => {
		// Actually send the DM
		bot.helpers.sendMessage(userDmChannel.id, message).catch((e: Error) => utils.commonLoggers.messageSendError('commandUtils.ts', message, e));
	}).catch((e: Error) => {
		// Edit failed, try to notify user
		utils.commonLoggers.messageGetError('commandUtils.ts', 'get userDmChannel', e);
	});
