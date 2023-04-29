import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { somethingWentWrong, warnColor } from '../../commandUtils.ts';
import { eventDateId, eventTimeId, eventTimeZoneId, idSeparator, LfgEmbedIndexes, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { addTokenToMap } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { applyEditButtons, applyEditMessage } from './utils.ts';
import { getDateFromRawInput } from '../event-creation/dateTimeUtils.ts';
import { generateTimeFieldStr } from '../event-creation/utils.ts';

export const customId = 'applyDateTime';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.data?.components?.length && interaction.member && interaction.channelId && interaction.guildId) {
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('applyDateTime.ts', 'get eventMessage', e));

		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || '');
			}
		}
		const newTime = tempDataMap.get(eventTimeId);
		const newTimeZone = tempDataMap.get(eventTimeZoneId);
		const newDate = tempDataMap.get(eventDateId);

		if (!newTime || !newTimeZone || !newDate) {
			// Error out if user somehow failed to provide one of the fields (eventDescription is allowed to be null/empty)
			somethingWentWrong(bot, interaction, `missingFieldFromEventDescription@${newTime}_${newTimeZone}_${newDate}`);
			return;
		}

		// Get Date Object from user input
		const [eventDateTime, eventDateTimeStr, eventInFuture, dateTimeValid] = getDateFromRawInput(newTime, newTimeZone, newDate);
		if (!eventInFuture || !dateTimeValid) {
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: warnColor,
						title: dateTimeValid ? 'You cannot create an event in the past.' : 'Could not parse date/time.',
						description: `Please dismiss this message and try again with a ${dateTimeValid ? 'date in the future' : 'valid date/time'}.`,
						fields: dateTimeValid ? [{
							name: 'Date/Time Entered:',
							value: generateTimeFieldStr(eventDateTimeStr, eventDateTime),
						}] : undefined,
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('applyDateTime.ts', interaction, e));
			return;
		}

		if (eventMessage && eventMessage.embeds[0].fields) {
			// eventMessage.embeds[0].fields[LfgEmbedIndexes.Description].value = newDescription || noDescProvided;
			eventMessage.embeds[0].fields[LfgEmbedIndexes.StartTime].value = generateTimeFieldStr(eventDateTimeStr, eventDateTime);
			const tIdx = eventMessage.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.indexOf('?t=') + 3;
			const nIdx = eventMessage.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.indexOf('&n=');
			eventMessage.embeds[0].fields[LfgEmbedIndexes.ICSLink].value = `${eventMessage.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.slice(0, tIdx)}${eventDateTime.getTime()}${
				eventMessage.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.slice(nIdx)
			}`;
			eventMessage.embeds[0].timestamp = eventDateTime.getTime();

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
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('applyDateTime.ts', interaction, e));
		} else {
			somethingWentWrong(bot, interaction, 'failedToGetEventMsgInApplyDateTime');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromApplyDateTime');
	}
};

export const applyDateTimeButton = {
	customId,
	execute,
};
