import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';
import { alternateMemberToEvent } from './utils.ts';

export const customId = 'alternateRequest';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.user && interaction.message && interaction.message.embeds[0] && interaction.message.embeds[0].description) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-joinReqAlt')).catch((e) => utils.commonLoggers.dbError('alternateRequest.ts', 'call sproc INC_CNT on', e));

		// Get details from message
		const eventIds = utils.messageUrlToIds(interaction.message.embeds[0].description.split(')')[0] || '');
		const eventMessage = await bot.helpers.getMessage(eventIds.channelId, eventIds.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('alternateRequest.ts', 'get eventMessage', e));

		// Try to alternate the member to the event
		if (eventMessage) {
			alternateMemberToEvent(
				bot,
				interaction,
				eventMessage.embeds[0],
				eventIds.messageId,
				eventIds.channelId,
				{
					id: interaction.user.id,
					name: interaction.user.username,
				},
				false,
				true,
			);
		} else {
			somethingWentWrong(bot, interaction, 'eventMissingFromAlternateRequestButton');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromAlternateRequestButton');
	}
};

export const alternateRequestButton = {
	customId,
	execute,
};
