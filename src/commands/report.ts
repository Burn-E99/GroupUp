import config from '../../config.ts';
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor2, isLFGChannel, somethingWentWrong, successColor } from '../commandUtils.ts';
import { dbClient, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';

const details: CommandDetails = {
	name: 'report',
	description: `Information about ${config.name} and its developer`,
	type: ApplicationCommandTypes.ChatInput,
	options: [
		{
			name: 'issue',
			type: ApplicationCommandOptionTypes.String,
			description: 'Please describe the issue you were having.',
			required: true,
			minLength: 1,
			maxLength: 2000,
		},
	],
};

const execute = (bot: Bot, interaction: Interaction) => {
	dbClient.execute(queries.callIncCnt('cmd-report')).catch((e) => utils.commonLoggers.dbError('report.ts', 'call sproc INC_CNT on', e));
	if (interaction.data?.options?.[0].value) {
		bot.helpers.sendMessage(config.reportChannel, {
			embeds: [{
				color: infoColor2,
				title: 'USER REPORT:',
				description: interaction.data.options[0].value as string,
			}],
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('report.ts:28', interaction, e));
		bot.helpers.sendInteractionResponse(
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
					embeds: [{
						color: successColor,
						title: 'Failed command has been reported to my developer.',
						description: `For more in depth support, and information about planned maintenance, please join the support server [here](${config.links.supportServer}).`,
					}],
				},
			},
		).catch((e: Error) => utils.commonLoggers.interactionSendError('report.ts:44', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'reportMissingAllOptions');
	}
};

export default {
	details,
	execute,
};
