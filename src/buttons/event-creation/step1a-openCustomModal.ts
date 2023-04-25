import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import { idSeparator, pathIdxSeparator } from '../eventUtils.ts';
import { customId as verifyCustomActivityId } from './step1b-verifyCustomActivity.ts';
import utils from '../../utils.ts';
import { dbClient, queries } from '../../db.ts';

export const customId = 'customAct';

export const activityTitleId = 'activityTitle';
export const activitySubtitleId = 'activitySubtitle';
export const activityMaxPlayersId = 'activityMaxPlayers';

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
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activityTitleId,
						label: 'Activity Title:',
						placeholder: 'The name of the game or event.',
						style: TextStyles.Short,
						minLength: 1,
						maxLength: 35,
						value: actTitle || undefined,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activitySubtitleId,
						label: 'Activity Subtitle:',
						placeholder: 'The specific activity within the game or event.',
						style: TextStyles.Short,
						minLength: 1,
						maxLength: 50,
						value: actSubtitle || undefined,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activityMaxPlayersId,
						label: 'Maximum Players:',
						placeholder: 'Please enter a number between 1 and 99.',
						style: TextStyles.Short,
						minLength: 1,
						maxLength: 2,
						value: activityMaxPlayers || undefined,
					}],
				}],
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1a-openCustomModal.ts:modal', interaction, e));
	}
};

export const createCustomEventButton = {
	customId,
	execute,
};
