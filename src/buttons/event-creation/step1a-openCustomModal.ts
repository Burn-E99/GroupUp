import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { generateCustomActivityFields, idSeparator, pathIdxSeparator } from '../eventUtils.ts';
import { customId as verifyCustomActivityId } from './step1b-verifyCustomActivity.ts';
import utils from '../../utils.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';

export const customId = 'customAct';

const execute = (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-customAct')).catch((e) => utils.commonLoggers.dbError('step1a-openCustomModal.ts', 'call sproc INC_CNT on', e));

		const [actTitle, actSubtitle, activityMaxPlayers] = (interaction.data.customId.split(idSeparator)[1] || '').split(pathIdxSeparator);

		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.Modal,
			data: {
				title: 'Create Custom Activity',
				customId: verifyCustomActivityId,
				components: generateCustomActivityFields(actTitle, actSubtitle, activityMaxPlayers),
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1a-openCustomModal.ts:modal', interaction, e));
	}
};

export const createCustomEventButton = {
	customId,
	execute,
};
