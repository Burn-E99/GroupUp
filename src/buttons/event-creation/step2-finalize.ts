import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { eventTimeId, eventTimeZoneId, eventDateId, eventDescriptionId } from './step1-gameSelection.ts';
import { getFinalActivity, tzMap, idSeparator, pathIdxSeparator } from './utils.ts';
import { Activities, Activity } from './activities.ts';

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

		const customIdIdxPath = ((interaction.data.customId || '').substring((interaction.data.customId || '').indexOf(idSeparator) + 1) || '');
		const rawIdxPath: Array<string> = customIdIdxPath.split(pathIdxSeparator);
		const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
		let category: string;
		let activity: Activity;
		if (idxPath.some(idx => isNaN(idx) || idx < 0)) {
			// Handle custom activity
			category = rawIdxPath[0];
			activity = {
				name: rawIdxPath[1],
				maxMembers: parseInt(rawIdxPath[2]) || NaN,
			};
		} else {
			// Handle preset activity
			category = Activities[idxPath[0]].name;
			activity = getFinalActivity(idxPath, Activities)
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

		// Verify/Set Time
		let preParsedEventTime = rawEventTime.replaceAll(':', '').toUpperCase();
		let parsedEventTimePeriod = '';
		// Get AM or PM out of the rawTime
		if (preParsedEventTime.endsWith('AM') || preParsedEventTime.endsWith('PM')) {
			parsedEventTimePeriod = preParsedEventTime.slice(-2);
			preParsedEventTime = preParsedEventTime.slice(0, -2).trim();
		}
		let parsedEventTimeHours: string;
		let parsedEventTimeMinutes: string;
		// Get Hours and Minutes out of rawTime
		if (preParsedEventTime.length > 2) {
			parsedEventTimeMinutes = preParsedEventTime.slice(-2);
			parsedEventTimeHours = preParsedEventTime.slice(0, -2).trim();
		} else {
			parsedEventTimeHours = preParsedEventTime.trim();
			parsedEventTimeMinutes = '00'
		}
		// Determine if we need to remove the time period
		if (parseInt(parsedEventTimeHours) > 12) {
			parsedEventTimePeriod = '';
		}

		// Verify/Set Time Zone
		let preParsedEventTimeZone = rawEventTimeZone.replaceAll(' ', '').trim().toUpperCase();
		let parsedEventTimeZone = '';
		if (tzMap.has(preParsedEventTimeZone)) {
			parsedEventTimeZone = tzMap.get(preParsedEventTimeZone) || 'UTC+0';
		} else {
			let addPlusSign = false;
			if (!preParsedEventTimeZone.includes('+') || !preParsedEventTimeZone.includes('-')) {
				addPlusSign = true;
			}
			if (!preParsedEventTimeZone.startsWith('UTC') || preParsedEventTimeZone.startsWith('GMT')) {
				preParsedEventTimeZone = `UTC${addPlusSign && '+'}${preParsedEventTimeZone}`;
			} else if (addPlusSign) {
				preParsedEventTimeZone = `${preParsedEventTimeZone.slice(0, 3)}+${preParsedEventTimeZone.slice(3)}`;
			}
			parsedEventTimeZone = preParsedEventTimeZone;
		}

		// Verify/Set Date

		somethingWentWrong(bot, interaction, `TESTING@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEventDescriptionModal');
	}
};

export const finalizeEventButton = {
	customId,
	execute,
};
