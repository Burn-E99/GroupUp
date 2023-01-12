import config from '../../config.ts';
import { ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor2, isLFGChannel } from '../commandUtils.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';

const details: CommandDetails = {
	name: 'info',
	description: `Information about ${config.name} and its developer`,
	type: ApplicationCommandTypes.ChatInput,
};

const execute = (bot: Bot, interaction: Interaction) => {
	bot.helpers.sendInteractionResponse(
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: isLFGChannel(interaction.channelId || 0n),
				embeds: [{
					color: infoColor2,
					title: `${config.name}, the LFG bot`,
					description: `${config.name} is developed by Ean AKA Burn_E99.
Want to check out my source code?  Check it out [here](${config.links.sourceCode}).
Need help with this bot?  Join my support server [here](${config.links.supportServer}).

Ran into a bug?  Report it to my developers using \`/report [issue description]\`.`,
					footer: {
						text: `Current Version: ${config.version}`,
					},
				}],
			},
		},
	).catch((e: Error) => utils.commonLoggers.interactionSendError('info.ts', interaction, e));
};

export default {
	details,
	execute,
};
