import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';
import { removeMemberFromEvent } from './utils.ts';

export const customId = 'leaveEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.channelId && interaction.message && interaction.message.embeds[0]) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-leaveEvent')).catch((e) => utils.commonLoggers.dbError('leaveEvent.ts', 'call sproc INC_CNT on', e));

		// Remove user from event
		removeMemberFromEvent(bot, interaction, interaction.message.embeds[0], interaction.message.id, interaction.channelId, interaction.member.id);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromLeaveEventButton');
	}
};

export const leaveEventButton = {
	customId,
	execute,
};
