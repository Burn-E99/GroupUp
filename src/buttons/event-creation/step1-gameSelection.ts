import { ActionRow, ApplicationCommandFlags, ApplicationCommandTypes, Bot, ButtonStyles, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { infoColor1, somethingWentWrong } from '../../commandUtils.ts';
import { CommandDetails } from '../../types/commandTypes.ts';
import { Activities } from './activities.ts';
import { generateActionRow, getNestedActivity } from './utils.ts';
import { dateTimeFields, descriptionTextField, idSeparator, LfgEmbedIndexes, lfgStartTimeName, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { addTokenToMap, deleteTokenEarly, generateMapId, selfDestructMessage, tokenMap } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { customId as createCustomActivityBtnId } from './step1a-openCustomModal.ts';
import { customId as finalizeEventBtnId } from './step2-finalize.ts';
import { monthsShort } from './dateTimeUtils.ts';
import { dbClient, queries } from '../../db.ts';

export const customId = 'gameSel';
const slashCommandName = 'create-event';
const details: CommandDetails = {
	name: slashCommandName,
	description: 'Creates a new event in this channel.',
	type: ApplicationCommandTypes.ChatInput,
};

const customEventRow: ActionRow = {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		style: ButtonStyles.Primary,
		label: 'Create Custom Event',
		customId: createCustomActivityBtnId,
	}],
};

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data && (interaction.data.name === slashCommandName || interaction.data.customId) && interaction.member && interaction.guildId && interaction.channelId) {
		// Light Telemetry
		if (interaction.data.name === slashCommandName) {
			dbClient.execute(queries.callIncCnt('cmd-gameSel')).catch((e) => utils.commonLoggers.dbError('step1-gameSelection.ts@cmd', 'call sproc INC_CNT on', e));
		}
		if (interaction.data.customId === customId) {
			dbClient.execute(queries.callIncCnt('btn-gameSel')).catch((e) => utils.commonLoggers.dbError('step1-gameSelection.ts@btn', 'call sproc INC_CNT on', e));
		}

		// Check if we are done
		const customIdIdxPath = (interaction.data.customId || '').substring((interaction.data.customId || '').indexOf(idSeparator) + 1) || '';
		const valuesIdxPath = interaction.data?.values?.[0] || '';
		const strippedIdxPath = interaction.data.customId?.includes(idSeparator) ? customIdIdxPath : valuesIdxPath;
		const finalizedIdxPath = strippedIdxPath.substring(0, strippedIdxPath.lastIndexOf(pathIdxEnder));
		if ((interaction.data.customId?.includes(idSeparator) && interaction.data.customId.endsWith(pathIdxEnder)) || interaction.data?.values?.[0].endsWith(pathIdxEnder)) {
			// User selected activity, give them the details modal and delete the selectMenus
			await deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

			let prefillTime = '';
			let prefillTimeZone = '';
			let prefillDate = '';
			let prefillDescription = '';
			if (interaction.message && interaction.message.embeds[0].fields && interaction.message.embeds[0].fields[LfgEmbedIndexes.StartTime].name === lfgStartTimeName) {
				let rawEventDateTime = interaction.message.embeds[0].fields[LfgEmbedIndexes.StartTime].value.split('\n')[0].split(' ');
				const monthIdx = rawEventDateTime.findIndex((item) => monthsShort.includes(item.toUpperCase()));
				prefillTime = rawEventDateTime.slice(0, monthIdx - 1).join(' ').trim();
				prefillTimeZone = rawEventDateTime[monthIdx - 1].trim();
				prefillDate = rawEventDateTime.slice(monthIdx).join(' ').trim();
				prefillDescription = interaction.message.embeds[0].fields[LfgEmbedIndexes.Description].value.trim();
			}

			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.Modal,
				data: {
					title: 'Enter Event Details',
					customId: `${finalizeEventBtnId}${idSeparator}${finalizedIdxPath}`,
					components: [...dateTimeFields(prefillTime, prefillTimeZone, prefillDate), descriptionTextField(prefillDescription)],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:modal', interaction, e));
			return;
		}

		// Parse indexPath from the select value
		const rawIdxPath: Array<string> = interaction.data.values ? interaction.data.values[0].split(pathIdxSeparator) : [''];
		const idxPath: Array<number> = rawIdxPath.map((rawIdx) => rawIdx ? parseInt(rawIdx) : -1);
		const selectMenus: Array<ActionRow> = [];
		let selectMenuCustomId = `${customId}$`;
		let currentBaseValue = '';

		for (let i = 0; i < idxPath.length; i++) {
			const idx = idxPath[i];
			const idxPathCopy = [...idxPath].slice(0, i);
			selectMenus.push(generateActionRow(currentBaseValue, getNestedActivity(idxPathCopy, Activities), selectMenuCustomId, idx));

			selectMenuCustomId = `${selectMenuCustomId}$`;
			currentBaseValue = `${currentBaseValue}${idx}${pathIdxSeparator}`;
		}

		selectMenus.push(customEventRow);

		if (interaction.data.customId && interaction.data.customId.includes('$')) {
			// Let discord know we didn't ignore the user
			await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:ping', interaction, e));

			// Update the original game selector
			await bot.helpers.editOriginalInteractionResponse(tokenMap.get(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id))?.token || '', {
				components: selectMenus,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:edit', interaction, e));
		} else {
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
						description: selfDestructMessage(new Date().getTime()),
						color: infoColor1,
					}],
					flags: ApplicationCommandFlags.Ephemeral,
					components: selectMenus,
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:init', interaction, e));
		}
	} else {
		somethingWentWrong(bot, interaction, 'missingCoreValuesOnGameSel');
	}
};

export const gameSelectionCommand = {
	details,
	execute,
};

export const gameSelectionButton = {
	customId,
	execute,
};
