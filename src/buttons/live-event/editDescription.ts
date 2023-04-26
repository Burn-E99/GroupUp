import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { dbClient, queries } from '../../db.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { descriptionTextField, idSeparator, LfgEmbedIndexes, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { customId as applyDescriptionCustomId } from './applyDescription.ts';

export const customId = 'editDescription';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.channelId && interaction.guildId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-eeChangeDesc')).catch((e) => utils.commonLoggers.dbError('editDescription.ts', 'call sproc INC_CNT on', e));
		deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('editDescription.ts', 'get eventMessage', e));
		const prefillDescription = eventMessage?.embeds[0].fields ? eventMessage.embeds[0].fields[LfgEmbedIndexes.Description].value.trim() : '';

		// Open Edit Description Modal
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.Modal,
			data: {
				title: 'Edit Event Description',
				customId: `${applyDescriptionCustomId}${idSeparator}${interaction.data.customId.split(idSeparator)[1] || ''}`,
				components: [descriptionTextField(prefillDescription)],
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('editDescription.ts', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEditDescriptionButton');
	}
};

export const editDescriptionButton = {
	customId,
	execute,
};
