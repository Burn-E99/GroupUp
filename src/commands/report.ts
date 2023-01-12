import config from '../../config.ts';
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes, sendMessage } from '../../deps.ts';
import { generateReport, isLFGChannel, successColor } from '../commandUtils.ts';
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
	console.log(interaction);
	dbClient.execute(queries.callIncCnt('report')).catch((e) => utils.commonLoggers.dbError('report.ts', 'call sproc INC_CNT on', e));
	sendMessage(bot, config.reportChannel, generateReport(interaction.data?.options?.[0].value as string || 'Missing Options')).catch((e: Error) =>
		utils.commonLoggers.interactionSendError('report.ts:28', interaction, e)
	);
	bot.helpers.sendInteractionResponse(
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: isLFGChannel(interaction.channelId || 0n),
				embeds: [{
					color: successColor,
					title: 'Failed command has been reported to my developer.',
					description: `For more in depth support, and information about planned maintenance, please join the support server [here](${config.links.supportServer}).`,
				}],
			},
		},
	).catch((e: Error) => utils.commonLoggers.interactionSendError('report.ts:44', interaction, e));
};

export default {
	details,
	execute,
};
