import config from '../../../config.ts';
import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, ButtonStyles, ApplicationCommandFlags } from '../../../deps.ts';
import { infoColor1, somethingWentWrong, failColor, safelyDismissMsg } from '../../commandUtils.ts';
import { addTokenToMap, idSeparator, pathIdxSeparator, pathIdxEnder, selfDestructMessage } from './utils.ts';
import { activityTitleId, activitySubtitleId, activityMaxPlayersId } from './step1a-openCustomModal.ts';
import { customId as gameSelectionId } from './step1-gameSelection.ts';
import { customId as openCustomModalId } from './step1a-openCustomModal.ts';
import utils from '../../utils.ts';

export const customId = 'verifyCustomActivity';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction?.data?.components?.length && interaction.guildId && interaction.channelId && interaction.member) {
		// Parse out our data
		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || 'missingValue');
			}
		}

		// Remove any pipe characters to avoid issues down the process
		const activityTitle = (tempDataMap.get(activityTitleId) || '').replace(/\|/g, '');
		const activitySubtitle = (tempDataMap.get(activitySubtitleId) || '').replace(/\|/g, '');
		const activityMaxPlayers = parseInt(tempDataMap.get(activityMaxPlayersId) || '0');
		if (isNaN(activityMaxPlayers) || activityMaxPlayers < 1 || activityMaxPlayers > 99) {
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: failColor,
						title: 'Invalid Max Member count!',
						description: `${config.name} parsed the max members as \`${isNaN(activityMaxPlayers) ? 'Not a Number' : activityMaxPlayers}\`, which is outside of the allowed range.  Please recreate this activity, but make sure the maximum player count is between 1 and 99.\n\n${safelyDismissMsg}`
					}],
				}
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1b-verifyCustomActivity.ts:invalidPlayer', interaction, e));
			return;
		}
		if (!activityMaxPlayers || !activitySubtitle || !activityTitle) {
			// Verify fields exist
			somethingWentWrong(bot, interaction, `missingFieldFromCustomActivity@${activityTitle}|${activitySubtitle}|${activityMaxPlayers}$`);
			return;
		}

		addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
		const idxPath = `${idSeparator}${activityTitle}${pathIdxSeparator}${activitySubtitle}${pathIdxSeparator}${activityMaxPlayers}`;
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					color: infoColor1,
					title: 'Please verify the following Custom Event details:',
					description: `Please note, pipe characters (\`|\`) are not allowed and will be automatically removed.\n\n${selfDestructMessage(new Date().getTime())}`,
					fields: [{
						name: 'Activity Title:',
						value: activityTitle,
					}, {
						name: 'Activity Subtitle:',
						value: activitySubtitle,
					}, {
						name: 'Maximum Players:',
						value: `${activityMaxPlayers}`,
					}],
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Success,
						label: 'Yup, looks great!',
						customId: `${gameSelectionId}${idxPath}${pathIdxEnder}`,
					},{
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Danger,
						label: 'Nope, let me change something.',
						customId: `${openCustomModalId}${idxPath}`,
					}]
				}]
			}
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1b-verifyCustomActivity.ts:message', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromCustomActivityModal');
	}
};

export const verifyCustomEventButton = {
	customId,
	execute,
};
