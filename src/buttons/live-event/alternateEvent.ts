import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';
import { alternateMemberToEvent } from './utils.ts';

export const customId = 'alternateEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.member.user && interaction.channelId && interaction.message && interaction.message.embeds[0]) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-altEvent')).catch((e) => utils.commonLoggers.dbError('alternateEvent.ts', 'call sproc INC_CNT on', e));

		// Add user to event
		alternateMemberToEvent(bot, interaction, interaction.message.embeds[0], interaction.message.id, interaction.channelId, {
			id: interaction.member.id,
			name: interaction.member.user.username,
		});
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromAlternateEventButton');
	}
};

export const alternateEventButton = {
	customId,
	execute,
};
