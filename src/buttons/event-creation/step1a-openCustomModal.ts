import { Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import { generateCustomActivityFields, idSeparator, pathIdxSeparator } from '../eventUtils.ts';
import { customId as verifyCustomActivityId } from './step1b-verifyCustomActivity.ts';
import utils from '../../utils.ts';
import { dbClient, queries } from '../../db.ts';

export const customId = 'customAct';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-customAct')).catch((e) => utils.commonLoggers.dbError('step1a-openCustomModal.ts', 'call sproc INC_CNT on', e));

		const [actTitle, actSubtitle, activityMaxPlayers] = (interaction.data.customId.split(idSeparator)[1] || '').split(pathIdxSeparator);

		await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
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
