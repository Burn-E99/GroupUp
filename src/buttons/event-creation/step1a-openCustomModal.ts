import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { deleteTokenEarly } from './utils.ts';
import utils from '../../utils.ts';

export const customId = 'createCustomActivity';

export const activityTitleId = 'activityTitle';
export const activitySubtitleId = 'activitySubtitle';
export const activityMaxPlayersId = 'activityMaxPlayers';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.member && interaction.guildId && interaction.channelId) {
		await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.Modal,
			data: {
				title: 'Create Custom Activity',
				customId: 'temp', //TODO: fix
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activityTitleId,
						label: 'Activity Title:',
						style: TextStyles.Short,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activitySubtitleId,
						label: 'Activity Subtitle:',
						style: TextStyles.Short,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.InputText,
						customId: activityMaxPlayersId,
						label: 'Max Players:',
						style: TextStyles.Short,
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
