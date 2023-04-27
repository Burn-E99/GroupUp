import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import { generateCustomActivityFields, idSeparator } from '../eventUtils.ts';
import { customId as editActivityCustomId } from './editActivity.ts';
import utils from '../../utils.ts';
import { dbClient, queries } from '../../db.ts';

export const customId = 'editActivityCustom';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-eeCustomAct')).catch((e) => utils.commonLoggers.dbError('step1a-openCustomModal.ts', 'call sproc INC_CNT on', e));

		deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.Modal,
			data: {
				title: 'Create Custom Activity',
				customId: `${editActivityCustomId}${idSeparator}${interaction.data.customId.split(idSeparator)[1] || ''}`,
				components: generateCustomActivityFields(),
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity-custom.ts', interaction, e));
	}
};

export const editActivityCustomButton = {
	customId,
	execute,
};
