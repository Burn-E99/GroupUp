import { ActionRow, ApplicationCommandFlags, Bot, ButtonStyles, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { failColor, infoColor1, safelyDismissMsg, somethingWentWrong } from '../../commandUtils.ts';
import { Activities, Activity } from '../event-creation/activities.ts';
import { generateActionRow, getFinalActivity, getNestedActivity } from '../event-creation/utils.ts';
import {
	activityMaxPlayersId,
	activitySubtitleId,
	activityTitleId,
	fillerChar,
	generateAlternateList,
	generateMemberList,
	generateMemberTitle,
	idSeparator,
	LfgEmbedIndexes,
	pathIdxEnder,
	pathIdxSeparator,
} from '../eventUtils.ts';
import { addTokenToMap, deleteTokenEarly, generateMapId, selfDestructMessage, tokenMap } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import config from '../../../config.ts';
import { dbClient } from '../../db/client.ts';
import { queries } from '../../db/common.ts';
import { customId as editActivityCustomCustomId } from './editActivity-custom.ts';
import { applyEditButtons, applyEditMessage, getEventMemberCount, getLfgMembers } from './utils.ts';
import { LFGMember } from '../../types/commandTypes.ts';

export const customId = 'editActivity';

const makeCustomEventRow = (customIdIdxPath: string): ActionRow => ({
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		style: ButtonStyles.Primary,
		label: 'Create Custom Event',
		customId: `${editActivityCustomCustomId}${idSeparator}${customIdIdxPath}`,
	}],
});

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId) {
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').replaceAll(fillerChar, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) =>
			BigInt(id || '0')
		);

		// Check if we are done
		const valuesIdxPath = interaction.data?.values?.[0] || '';
		const finalizedIdxPath = valuesIdxPath.substring(0, valuesIdxPath.lastIndexOf(pathIdxEnder));
		if (interaction.data?.values?.[0].endsWith(pathIdxEnder) || (interaction.data?.components && interaction.data.components.length > 0)) {
			// User selected activity, give them the confirmation message and delete the selectMenus
			await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

			// Fill in the activity details
			let selectedCategory = '';
			let selectedActivity: Activity = {
				name: '',
				maxMembers: 0,
			};
			if (interaction.data.components) {
				// Parse out our data
				const tempDataMap: Map<string, string> = new Map();
				for (const row of interaction.data.components) {
					if (row.components?.[0]) {
						const textField = row.components[0];
						tempDataMap.set(textField.customId || 'missingCustomId', textField.value || '');
					}
				}

				// Remove any pipe characters to avoid issues down the process
				const activityTitle = (tempDataMap.get(activityTitleId) ?? '').replace(/\|/g, '');
				const activitySubtitle = (tempDataMap.get(activitySubtitleId) ?? '').replace(/\|/g, '');
				const activityMaxPlayers = parseInt(tempDataMap.get(activityMaxPlayersId) ?? '0');
				if (isNaN(activityMaxPlayers) || activityMaxPlayers < 1 || activityMaxPlayers > 99) {
					bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: ApplicationCommandFlags.Ephemeral,
							embeds: [{
								color: failColor,
								title: 'Invalid Max Member count!',
								description: `${config.name} parsed the max members as \`${
									isNaN(activityMaxPlayers) ? 'Not a Number' : activityMaxPlayers
								}\`, which is outside of the allowed range.  Please re-edit this activity, but make sure the maximum player count is between 1 and 99.\n\n${safelyDismissMsg}`,
							}],
						},
					}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity.ts@invalidPlayer', interaction, e));
					return;
				}
				if (!activityMaxPlayers || !activitySubtitle || !activityTitle) {
					// Verify fields exist
					somethingWentWrong(bot, interaction, `missingFieldFromEditCustomActivity@${activityTitle}|${activitySubtitle}|${activityMaxPlayers}$`);
					return;
				}
				selectedCategory = activityTitle;
				selectedActivity.name = activitySubtitle;
				selectedActivity.maxMembers = activityMaxPlayers;

				// Log custom event to see if we should add it as a preset
				dbClient.execute(queries.insertCustomActivity, [interaction.guildId, selectedCategory, selectedActivity.name, selectedActivity.maxMembers]).catch((e) =>
					utils.commonLoggers.dbError('editActivity.ts@custom', 'insert into', e)
				);
			} else {
				const rawIdxPath: Array<string> = finalizedIdxPath.split(pathIdxSeparator);
				const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
				selectedCategory = Activities[idxPath[0]].name;
				selectedActivity = getFinalActivity(idxPath, Activities);
			}

			if (
				!selectedActivity.maxMembers || !selectedCategory || !selectedActivity.name || (isNaN(selectedActivity.maxMembers) || (selectedActivity.maxMembers < 1 || selectedActivity.maxMembers > 99))
			) {
				// Verify fields exist
				somethingWentWrong(bot, interaction, `parseFailInEditCustomActivity@${selectedCategory}|${selectedActivity.name}|${selectedActivity.maxMembers || 'undefined'}$`);
				return;
			}

			// Get event to apply edit
			const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('editActivity.ts', 'get eventMessage', e));
			if (eventMessage?.embeds[0].fields) {
				await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
				// Update member lists
				const [currentMemberCount, _oldMaxMemberCount] = getEventMemberCount(eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].name);
				const currentMembers = getLfgMembers(eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].value);
				const currentAlternates = getLfgMembers(eventMessage.embeds[0].fields[LfgEmbedIndexes.AlternateMembers].value);
				if (currentMemberCount > selectedActivity.maxMembers) {
					const membersToAlternate = currentMembers.splice(selectedActivity.maxMembers).map((member): LFGMember => ({
						id: member.id,
						name: member.name,
						joined: true,
					}));
					currentAlternates.unshift(...membersToAlternate);
				}

				// Apply edits
				eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].name = `${selectedCategory}:`;
				eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].value = selectedActivity.name;
				eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].name = generateMemberTitle(currentMembers, selectedActivity.maxMembers);
				eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].value = generateMemberList(currentMembers);
				eventMessage.embeds[0].fields[LfgEmbedIndexes.AlternateMembers].value = generateAlternateList(currentAlternates);

				// Send edit confirmation
				addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						content: applyEditMessage(new Date().getTime()),
						embeds: [eventMessage.embeds[0]],
						components: applyEditButtons(interaction.data.customId.replaceAll(fillerChar, '').split(idSeparator)[1] || ''),
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity.ts', interaction, e));
			} else {
				somethingWentWrong(bot, interaction, 'failedToGetEventMsgInEditActivity');
			}
			return;
		}

		// Parse indexPath from the select value
		const rawIdxPath: Array<string> = interaction.data.values ? interaction.data.values[0].split(pathIdxSeparator) : [''];
		const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
		const selectMenus: Array<ActionRow> = [];
		// Use fillerChar to create unique customIds for dropdowns
		// We also leverage this to determine if its the first time the user has entered gameSel
		let selectMenuCustomId = `${interaction.data.customId.replaceAll(fillerChar, '')}${fillerChar}`;
		let currentBaseValue = '';

		for (let i = 0; i < idxPath.length; i++) {
			const idx = idxPath[i];
			const idxPathCopy = [...idxPath].slice(0, i);
			selectMenus.push(generateActionRow(currentBaseValue, getNestedActivity(idxPathCopy, Activities), selectMenuCustomId, idx));

			selectMenuCustomId = `${selectMenuCustomId}${fillerChar}`;
			currentBaseValue = `${currentBaseValue}${idx}${pathIdxSeparator}`;
		}

		selectMenus.push(makeCustomEventRow(interaction.data.customId.replaceAll(fillerChar, '').split(idSeparator)[1] || ''));

		if (interaction.data.customId.includes(fillerChar)) {
			// Let discord know we didn't ignore the user
			await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity.ts@ping', interaction, e));

			// Update the original game selector
			await bot.helpers.editOriginalInteractionResponse(tokenMap.get(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id))?.token || '', {
				components: selectMenus,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity.ts@edit', interaction, e));
		} else {
			// Light Telemetry (placed here so it only gets called on first run)
			dbClient.execute(queries.callIncCnt('btn-eeChangeAct')).catch((e) => utils.commonLoggers.dbError('editActivity.ts', 'call sproc INC_CNT on', e));

			// Delete old token entry if it exists
			await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

			// Store token for later use
			addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

			// Send initial interaction
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						title: 'Please select a Game and Activity, or create a Custom Event.',
						description: `Changing activity for [this event](${
							utils.idsToMessageUrl({
								guildId: interaction.guildId,
								channelId: evtChannelId,
								messageId: evtMessageId,
							})
						}).\n\n${selfDestructMessage(new Date().getTime())}`,
						color: infoColor1,
					}],
					flags: ApplicationCommandFlags.Ephemeral,
					components: selectMenus,
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('editActivity.ts@init', interaction, e));
		}
	} else {
		somethingWentWrong(bot, interaction, 'missingCoreValuesOnEditActivity');
	}
};

export const editActivityButton = {
	customId,
	execute,
};
