import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { idSeparator } from '../eventUtils.ts';
import utils from '../../utils.ts';
import { joinMemberToEvent } from './utils.ts';

export const customId = 'joinEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.member.user && interaction.channelId && interaction.message && interaction.message.embeds[0]) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt(interaction.data.customId.includes(idSeparator) ? 'btn-joinWLEvent' : 'btn-joinEvent')).catch((e) =>
			utils.commonLoggers.dbError('joinEvent.ts', 'call sproc INC_CNT on', e)
		);

		// Remove user from event
		joinMemberToEvent(bot, interaction, interaction.message.embeds[0], interaction.message.id, interaction.channelId, {
			id: interaction.member.id,
			name: interaction.member.user.username,
		});
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromJoinEventButton');
	}
};

export const joinEventButton = {
	customId,
	execute,
};
