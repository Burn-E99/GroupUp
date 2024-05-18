import { Bot, Interaction } from '../../../deps.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';
import { removeMemberFromEvent } from './utils.ts';

export const customId = 'leaveEvent';

const execute = (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.channelId && interaction.guildId && interaction?.message?.embeds?.[0]) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-leaveEvent')).catch((e) => utils.commonLoggers.dbError('leaveEvent.ts', 'call sproc INC_CNT on', e));

		// Remove user from event
		removeMemberFromEvent(bot, interaction, interaction.message.embeds[0], interaction.message.id, interaction.channelId, interaction.member.id, interaction.guildId);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromLeaveEventButton');
	}
};

export const leaveEventButton = {
	customId,
	execute,
};
