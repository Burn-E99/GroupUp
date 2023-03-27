import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { eventDateId, eventDescriptionId, eventTimeId, eventTimeZoneId } from './step1-gameSelection.ts';
import { getFinalActivity, idSeparator, pathIdxSeparator } from './utils.ts';
import { Activities, Activity } from './activities.ts';
import { getDateFromRawInput } from './dateTimeUtils.ts';

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

		const customIdIdxPath = (interaction.data.customId || '').substring((interaction.data.customId || '').indexOf(idSeparator) + 1) || '';
		const rawIdxPath: Array<string> = customIdIdxPath.split(pathIdxSeparator);
		const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
		let category: string;
		let activity: Activity;
		if (idxPath.some((idx) => isNaN(idx) || idx < 0)) {
			// Handle custom activity
			category = rawIdxPath[0];
			activity = {
				name: rawIdxPath[1],
				maxMembers: parseInt(rawIdxPath[2]) || NaN,
			};
		} else {
			// Handle preset activity
			category = Activities[idxPath[0]].name;
			activity = getFinalActivity(idxPath, Activities);
		}

		if (!category || !activity.name || !activity.maxMembers || isNaN(activity.maxMembers)) {
			// Error out if our activity or category is missing
			somethingWentWrong(bot, interaction, `missingActivityFromFinalize@${category}_${activity.name}_${activity.maxMembers}`);
		}

		const rawEventTime = tempDataMap.get(eventTimeId) || '';
		const rawEventTimeZone = tempDataMap.get(eventTimeZoneId) || '';
		const rawEventDate = tempDataMap.get(eventDateId) || '';
		const eventDescription = tempDataMap.get(eventDescriptionId) || 'No Description Provided.';
		if (!rawEventTime || !rawEventTimeZone || !rawEventDate) {
			// Error out if user somehow failed to provide one of the fields (eventDescription is allowed to be null/empty)
			somethingWentWrong(bot, interaction, `missingFieldFromEventDescription@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
			return;
		}

		// Get Date Object from user input
		const eventDateTime = getDateFromRawInput(rawEventTime, rawEventTimeZone, rawEventDate);

		somethingWentWrong(bot, interaction, `TESTING@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEventDescriptionModal');
	}
};

export const finalizeEventButton = {
	customId,
	execute,
};
