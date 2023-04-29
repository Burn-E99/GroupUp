import { ApplicationCommandFlags, Bot, CreateMessage, Embed, Interaction, InteractionResponseTypes } from '../deps.ts';
import config from '../config.ts';
import { generateGuildSettingKey, lfgChannelSettings } from './db.ts';
import utils from './utils.ts';
import { helpSlashName, infoSlashName, reportSlashName } from './commands/slashCommandNames.ts';

export const failColor = 0xe71212;
export const warnColor = 0xe38f28;
export const successColor = 0x0f8108;
export const infoColor1 = 0x313bf9;
export const infoColor2 = 0x6805e9;

export const safelyDismissMsg = 'You may safely dismiss this message.';

export const getRandomStatus = (guildCount: number): string => {
	const statuses = [
		`Running V${config.version}`,
		`${config.prefix}${infoSlashName} to learn more`,
		`${config.prefix}${helpSlashName} to learn more`,
		`Running LFGs in ${guildCount} servers`,
	];
	return statuses[Math.floor(Math.random() * statuses.length)];
};

export const isLFGChannel = (guildId: bigint, channelId: bigint) => {
	return (lfgChannelSettings.has(generateGuildSettingKey(guildId, channelId)) || channelId === 0n || guildId === 0n) ? ApplicationCommandFlags.Ephemeral : undefined;
};

// Tell user to try again or report issue
export const somethingWentWrong = async (bot: Bot, interaction: Interaction, errorCode: string) =>
	bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				color: failColor,
				title: 'Something went wrong...',
				description: `You should not be able to get here.  Please try again and if the issue continues, \`/${reportSlashName}\` this issue to the developers with the error code below.`,
				fields: [{
					name: 'Error Code:',
					value: `\`${errorCode}\``,
				}],
			}],
		},
	}).catch((e: Error) => utils.commonLoggers.interactionSendError('commandUtils.ts@somethingWentWrong', interaction, e));

// Smack the user for trying to modify an event that isn't theirs
export const stopThat = async (bot: Bot, interaction: Interaction, stopWhat: string) =>
	bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				color: warnColor,
				title: 'Hey!  Stop that!',
				description: `You are neither the owner of this event nor a ${config.name} manager in this guild, meaning you are not allowed to ${stopWhat} this event.

${safelyDismissMsg}`,
			}],
		},
	}).catch((e: Error) => utils.commonLoggers.interactionSendError('commandUtils.ts@stopThat', interaction, e));

// Send DM to User
export const sendDirectMessage = async (bot: Bot, userId: bigint, message: CreateMessage) => {
	const userDmChannel = await bot.helpers.getDmChannel(userId).catch((e: Error) => utils.commonLoggers.messageGetError('commandUtils.ts', 'get userDmChannel', e));
	// Actually send the DM
	return bot.helpers.sendMessage(userDmChannel?.id || 0n, message);
};

// Info Embed Object (for info command and @mention command)
export const infoEmbed: Embed = {
	color: infoColor2,
	title: `${config.name}, the LFG bot`,
	description: `${config.name} is developed by Ean AKA Burn_E99.
Want to check out my source code?  Check it out [here](${config.links.sourceCode}).
Need help with this bot?  Join my support server [here](${config.links.supportServer}).

Ran into a bug?  Report it to my developers using \`/${reportSlashName} [issue description]\`.`,
	footer: {
		text: `Current Version: ${config.version}`,
	},
};

export const dmTestMessage: CreateMessage = {
	embeds: [{
		color: infoColor2,
		title: 'Heyo!  Just making sure I can reach you.',
		description: 'This message is just to make sure I can DM you any Join Requests to your event.  If you are reading this message, it means you have everything set up correctly.',
	}],
};
