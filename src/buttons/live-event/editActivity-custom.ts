import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { generateCustomActivityFields, idSeparator } from '../eventUtils.ts';
import { customId as editActivityCustomId } from './editActivity.ts';
import utils from '../../utils.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';

export const customId = 'editActivityCustom';

const execute = (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-eeCustomAct')).catch((e) => utils.commonLoggers.dbError('step1a-openCustomModal.ts', 'call sproc INC_CNT on', e));

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
