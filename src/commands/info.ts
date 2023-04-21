import config from '../../config.ts';
import { ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoEmbed, isLFGChannel } from '../commandUtils.ts';
import { dbClient, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';

const details: CommandDetails = {
	name: 'info',
	description: `Information about ${config.name} and its developer`,
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
