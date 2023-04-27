import { Bot, Interaction } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import utils from '../../utils.ts';
import { removeMemberFromEvent } from './utils.ts';
import { idSeparator, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';

export const customId = 'leaveEventViaDM';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-leaveEventViaDM')).catch((e) => utils.commonLoggers.dbError('leaveEventViaDM.ts', 'call sproc INC_CNT on', e));

		const [evtGuildId, evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('editActivity.ts', 'get eventMessage', e));

		if (eventMessage && eventMessage.embeds[0]) {
			// Remove user from event
			removeMemberFromEvent(bot, interaction, eventMessage.embeds[0], evtMessageId, evtChannelId, interaction.user.id, evtGuildId, true);
		} else {
			somethingWentWrong(bot, interaction, 'getEventFailInLeaveEventViaDMButton');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromLeaveEventViaDMButton');
	}
};

export const leaveEventViaDMButton = {
	customId,
	execute,
};
