import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { eventDescriptionId, idSeparator, LfgEmbedIndexes, noDescProvided, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { addTokenToMap, deleteTokenEarly } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { applyEditButtons, applyEditMessage } from './utils.ts';

export const customId = 'applyDescription';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.data?.components?.length && interaction.member && interaction.channelId && interaction.guildId) {
		await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('applyDescription.ts', 'get eventMessage', e));

		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || '');
			}
		}
		const newDescription = tempDataMap.get(eventDescriptionId);

		if (eventMessage && eventMessage.embeds[0].fields) {
			eventMessage.embeds[0].fields[LfgEmbedIndexes.Description].value = newDescription || noDescProvided;

			// Send edit confirmation
			addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					content: applyEditMessage(new Date().getTime()),
					embeds: [eventMessage.embeds[0]],
					components: applyEditButtons(interaction.data.customId.split(idSeparator)[1] || ''),
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('applyDescription.ts', interaction, e));
		} else {
			somethingWentWrong(bot, interaction, 'failedToGetEventMsgInApplyDescription');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromApplyDescription');
	}
};

export const applyDescriptionButton = {
	customId,
	execute,
};
