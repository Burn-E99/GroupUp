import config from '../../config.ts';
import { ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor1, isLFGChannel } from '../commandUtils.ts';
import { dbClient, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { createEventSlashName, helpSlashName, setupSlashName } from './slashCommandNames.ts';

const details: CommandDetails = {
	name: helpSlashName,
	description: `How to set up and use ${config.name} in your guild.`,
	type: ApplicationCommandTypes.ChatInput,
};

const execute = (bot: Bot, interaction: Interaction) => {
	dbClient.execute(queries.callIncCnt('cmd-help')).catch((e) => utils.commonLoggers.dbError('help.ts', 'call sproc INC_CNT on', e));
	bot.helpers.sendInteractionResponse(
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
				embeds: [{
					color: infoColor1,
					title: `Getting Started with ${config.name}:`,
					description: `Thanks for inviting ${config.name}, the event scheduling bot.  There are two ways you can use the bot:`,
					fields: [{
						name: 'Dedicated Event/LFG Channel:',
						value:
							`To create a dedicated event/LFG channel, simply have the guild owner or member with the \`ADMINISTRATOR\` permission run the \`/${setupSlashName}\` in the desired channel.  This command will walk you through everything necessary to set up the channel.`,
						inline: true,
					}, {
						name: 'Chat channel with events mixed into:',
						value: `To create events in any chat channel ${config.name} can see, simply run the \`/${createEventSlashName}\` command.`,
						inline: true,
					}, {
						name: 'Need help or have questions?',
						value: `Just join the official support server by [clicking here](${config.links.supportServer}) and ask away!`,
					}],
				}],
			},
		},
	).catch((e: Error) => utils.commonLoggers.interactionSendError('help.ts', interaction, e));
};

export default {
	details,
	execute,
};
