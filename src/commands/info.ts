import config from '../../config.ts';
import { ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoEmbed, isLFGChannel } from '../commandUtils.ts';
import { dbClient } from '../db/client.ts';
import { queries } from '../db/common.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { infoSlashName } from './slashCommandNames.ts';

const details: CommandDetails = {
	name: infoSlashName,
	description: `Information about ${config.name}, its Terms of Service, its Privacy Policy, and its developer.`,
	type: ApplicationCommandTypes.ChatInput,
};

const execute = (bot: Bot, interaction: Interaction) => {
	dbClient.execute(queries.callIncCnt('cmd-info')).catch((e) => utils.commonLoggers.dbError('info.ts', 'call sproc INC_CNT on', e));
	bot.helpers.sendInteractionResponse(
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
				embeds: [infoEmbed],
			},
		},
	).catch((e: Error) => utils.commonLoggers.interactionSendError('info.ts', interaction, e));
};

export default {
	details,
	execute,
};
