import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { dateTimeFields, idSeparator, LfgEmbedIndexes, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { monthsShort } from '../event-creation/dateTimeUtils.ts';
import utils from '../../utils.ts';
import { customId as applyDateTimeCustomId } from './applyDateTime.ts';

export const customId = 'editDateTime';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.channelId && interaction.guildId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-eeChangeTime')).catch((e) => utils.commonLoggers.dbError('editDateTime.ts', 'call sproc INC_CNT on', e));

		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('editDateTime.ts', 'get eventMessage', e));
		const rawEventDateTime = eventMessage?.embeds[0].fields ? eventMessage.embeds[0].fields[LfgEmbedIndexes.StartTime].value.trim().split('\n')[0].split(' ') : [];
		const monthIdx = rawEventDateTime.findIndex((item) => monthsShort.includes(item.toUpperCase()));
		const prefillTime = rawEventDateTime.slice(0, monthIdx - 1).join(' ').trim();
		const prefillTimeZone = rawEventDateTime[monthIdx - 1].trim();
		const prefillDate = rawEventDateTime.slice(monthIdx).join(' ').trim();

		// Open Edit Date/Time Modal
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.Modal,
			data: {
				title: 'Edit Event Date/Time',
				customId: `${applyDateTimeCustomId}${idSeparator}${interaction.data.customId.split(idSeparator)[1] || ''}`,
				components: dateTimeFields(prefillTime, prefillTimeZone, prefillDate),
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('editDateTime.ts', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEditDateTimeButton');
	}
};

export const editDateTimeButton = {
	customId,
	execute,
};
