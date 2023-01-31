import { ApplicationCommandFlags, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, ActionRow, ButtonStyles, TextStyles } from '../../../deps.ts';
import { infoColor1, somethingWentWrong } from '../../commandUtils.ts';
import { CommandDetails } from '../../types/commandTypes.ts';
import { Activities } from './activities.ts';
import { generateActionRow, getNestedActivity, generateMapId, pathIdxSeparator, pathIdxEnder } from './utils.ts';
import utils from '../../utils.ts';

export const customId = 'gameSel';
const slashCommandName = 'create-event';
// Discord Interaction Tokens last 15 minutes, we will self kill after 14.5 minutes
const tokenTimeoutS = (15 * 60) - 30;
const tokenTimeoutMS = tokenTimeoutS * 1000;
const details: CommandDetails = {
	name: slashCommandName,
	description: 'Creates a new event in this channel.',
	type: ApplicationCommandTypes.ChatInput,
};

const tokenMap: Map<string, {
	token: string,
	timeoutId: number,
}> = new Map();

const customEventRow: ActionRow = {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.Button,
		label: 'Create Custom Event',
		customId,
		style: ButtonStyles.Primary,
	}],
}

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data && (interaction.data.name === slashCommandName || interaction.data.customId) && interaction.member && interaction.guildId && interaction.channelId) {
		// Parse indexPath from the select value
		const rawIdxPath: Array<string> = interaction.data.values ? interaction.data.values[0].split(pathIdxSeparator) : [''];
		const idxPath: Array<number> = rawIdxPath.map(rawIdx => rawIdx ? parseInt(rawIdx) : -1);

		if (interaction.data.values && interaction.data.values[0] && interaction.data.values[0].endsWith(pathIdxEnder)) {
			// User selected activity, give them the details modal and delete the selectMenus
			bot.helpers.deleteOriginalInteractionResponse(tokenMap.get(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id))?.token || '').catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:cleanup', interaction, e));
			tokenMap.delete(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id));
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.Modal,
				data: {
					title: 'Enter Event Details',
					customId: 'temp', //TODO: fix
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.InputText,
							customId: 'eventTime',
							label: 'Start Time:',
							style: TextStyles.Short,
						}]
					},{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.InputText,
							customId: 'eventTimeZone',
							label: 'Time Zone:',
							style: TextStyles.Short,
						}]
					},{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.InputText,
							customId: 'eventDate',
							label: 'Start Date:',
							style: TextStyles.Short,
						}]
					},{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.InputText,
							customId: 'eventDescription',
							label: 'Description:',
							style: TextStyles.Paragraph,
						}]
					}]
				},
			})
			return;
		}

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
			if (tokenMap.has(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id))) {
				bot.helpers.deleteOriginalInteractionResponse(tokenMap.get(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id))?.token || '').catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:cleanup', interaction, e));
				tokenMap.delete(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id));
			}

			// Store token for later use
			tokenMap.set(generateMapId(interaction.guildId, interaction.channelId, interaction.member.id), {
				token: interaction.token,
				timeoutId: setTimeout((guildId, channelId, memberId) => {
					bot.helpers.deleteOriginalInteractionResponse(tokenMap.get(generateMapId(guildId, channelId, memberId))?.token || '').catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:delete', interaction, e));
					tokenMap.delete(generateMapId(guildId, channelId, memberId));
				}, tokenTimeoutMS, interaction.guildId, interaction.channelId, interaction.member.id),
			});

			// Calculate destruction time
			const destructTime = Math.floor((new Date().getTime() + tokenTimeoutMS) / 1000);

			// Send initial interaction
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						title: 'Please select a Game and Activity, or create a Custom Event.',
						description: `Please note: This message will self destruct <t:${destructTime}:R> due to limits imposed by the Discord API.`,
						color: infoColor1,
					}],
					flags: ApplicationCommandFlags.Ephemeral,
					components: selectMenus,
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1-gameSelection.ts:init', interaction, e));
		}
	} else {
		somethingWentWrong;
	}
};

export const createEventCommand = {
	details,
	execute,
};

export const createEventButton = {
	customId,
	execute,
};
