import config from '../../config.ts';
import { ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor1, isLFGChannel } from '../commandUtils.ts';
import { dbClient, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { helpSlashName } from './slashCommandNames.ts';

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
					title: `Getting started with ${config.name}:`,
					description: `Thanks for inviting ${config.name}, the event scheduling bot.`,
				}],
			},
		},
	).catch((e: Error) => utils.commonLoggers.interactionSendError('help.ts', interaction, e));
};

export default {
	details,
	execute,
};
