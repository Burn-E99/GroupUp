import { Bot, Interaction } from '../../../deps.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { createLFGPost, getFinalActivity } from './utils.ts';
import { eventDateId, eventDescriptionId, eventTimeId, eventTimeZoneId, idSeparator, noDescProvided, pathIdxSeparator } from '../eventUtils.ts';
import { addTokenToMap, deleteTokenEarly } from '../tokenCleanup.ts';
import { Activities, Activity } from './activities.ts';
import { getDateFromRawInput } from './dateTimeUtils.ts';
import utils from '../../utils.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';

export const customId = 'finalize';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.components?.length && interaction.guildId && interaction.channelId && interaction?.member?.user) {
		// User selected activity and has filled out fields, delete the selectMenus
		await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || '');
			}
		}

		const customIdIdxPath = (interaction.data.customId || '').substring((interaction.data.customId || '').indexOf(idSeparator) + 1) || '';
		const rawIdxPath: Array<string> = customIdIdxPath.split(pathIdxSeparator);
		const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
		let category: string;
		let activity: Activity;
		let customAct = false;
		if (idxPath.some((idx) => isNaN(idx) || idx < 0)) {
			customAct = true;
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

		// Log custom event to see if we should add it as a preset
		if (customAct) {
			dbClient.execute(queries.insertCustomActivity, [interaction.guildId, category, activity.name, activity.maxMembers]).catch((e) =>
				utils.commonLoggers.dbError('step2-finalize.ts@custom', 'insert into', e)
			);
		}

		const rawEventTime = tempDataMap.get(eventTimeId) ?? '';
		const rawEventTimeZone = tempDataMap.get(eventTimeZoneId) ?? '';
		const rawEventDate = tempDataMap.get(eventDateId) ?? '';
		const eventDescription = tempDataMap.get(eventDescriptionId) ?? noDescProvided;
		if (!rawEventTime || !rawEventTimeZone || !rawEventDate) {
			// Error out if user somehow failed to provide one of the fields (eventDescription is allowed to be null/empty)
			somethingWentWrong(bot, interaction, `missingFieldFromEventDescription@${rawEventTime}_${rawEventTimeZone}_${rawEventDate}`);
			return;
		}

		// Get Date Object from user input
		const [eventDateTime, eventDateTimeStr, eventInFuture, dateTimeValid, usTZWarning] = getDateFromRawInput(rawEventTime, rawEventTimeZone, rawEventDate, true);

		addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
		bot.helpers.sendInteractionResponse(
			interaction.id,
			interaction.token,
			createLFGPost(
				category,
				activity,
				eventDateTime,
				eventDateTimeStr,
				eventDescription,
				interaction.member.id,
				interaction.member.user.username,
				[{
					id: interaction.member.id,
					name: interaction.member.user.username,
				}],
				[],
				customIdIdxPath,
				eventInFuture,
				dateTimeValid,
				usTZWarning,
			),
		).catch((e: Error) => utils.commonLoggers.interactionSendError('step2-finalize.ts', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEventDescriptionModal');
	}
};

export const finalizeEventButton = {
	customId,
	execute,
};
