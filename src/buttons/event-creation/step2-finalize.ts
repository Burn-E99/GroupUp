import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { eventTimeId, eventTimeZoneId, eventDateId, eventDescriptionId } from './step1-gameSelection.ts';

export const customId = 'finalize';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction?.data?.components?.length && interaction.guildId && interaction.channelId && interaction.member) {
		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || 'missingValue');
			}
		}

		console.log(interaction.data.customId)
		const rawEventTime = tempDataMap.get(eventTimeId) || '';
		const rawEventTimeZone = tempDataMap.get(eventTimeZoneId) || '';
		const rawEventDate = tempDataMap.get(eventDateId) || '';
		const eventDescription = tempDataMap.get(eventDescriptionId) || 'No Description Provided.';
		if (!rawEventTime || !rawEventTimeZone || !rawEventDate) {
			// Error out if user somehow failed to provide one of the fields (eventDescription is allowed to be null/empty)
			somethingWentWrong(bot, interaction, `missingFieldFromEventDescription@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
			return;
		}
		somethingWentWrong(bot, interaction, `missingFieldFromEventDescription@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEventDescriptionModal');
	}
};

export const finalizeEventButton = {
	customId,
	execute,
};
