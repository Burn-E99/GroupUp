import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { idSeparator } from '../event-creation/utils.ts';
import utils from '../../utils.ts';

export const customId = 'joinEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.message && interaction.message.embeds[0] && interaction.message.embeds[0].fields) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt(interaction.data.customId.includes(idSeparator) ? 'btn-joinWLEvent' : 'btn-joinEvent')).catch((e) =>
			utils.commonLoggers.dbError('joinEvent.ts', 'call sproc INC_CNT on', e)
		);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromJoinEventButton');
	}
};

export const joinEventButton = {
	customId,
	execute,
};
