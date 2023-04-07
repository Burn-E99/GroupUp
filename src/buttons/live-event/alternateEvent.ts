import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';

export const customId = 'alternateEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.message && interaction.message.embeds[0] && interaction.message.embeds[0].fields) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-altEvent')).catch((e) => utils.commonLoggers.dbError('alternateEvent.ts', 'call sproc INC_CNT on', e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromAlternateEventButton');
	}
};

export const alternateEventButton = {
	customId,
	execute,
};
