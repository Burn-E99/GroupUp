import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { dbClient, generateGuildSettingKey, lfgChannelSettings, queries } from '../../db.ts';
import { failColor, infoColor1, infoColor2, safelyDismissMsg, sendDirectMessage, somethingWentWrong, successColor } from '../../commandUtils.ts';
import { generateMemberList, idSeparator, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import utils from '../../utils.ts';
import config from '../../../config.ts';
import { getGuildName } from './utils.ts';

export const customId = 'deleteConfirmed';
export const confirmedCustomId = 'confirmedCustomId';
export const confirmStr = 'yes';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.data?.components?.length && interaction.channelId && interaction.guildId && interaction.member && interaction.member.user) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-confirmDelEvent')).catch((e) => utils.commonLoggers.dbError('deleteConfirmed.ts@incCnt', 'call sproc INC_CNT on', e));

		// Parse out our data
		const tempDataMap: Map<string, string> = new Map();
		for (const row of interaction.data.components) {
			if (row.components?.[0]) {
				const textField = row.components[0];
				tempDataMap.set(textField.customId || 'missingCustomId', textField.value || 'missingValue');
			}
		}
		const actionByManager = interaction.data.customId.endsWith(pathIdxEnder);
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || {
			managed: false,
			managerRoleId: 0n,
			logChannelId: 0n,
		};

		if (tempDataMap.get(confirmedCustomId)?.toLowerCase() === confirmStr) {
			const guildName = await getGuildName(bot, interaction.guildId);
			const eventMessage = await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('deleteConfirmed.ts', 'get eventMessage', e));
			const userId = interaction.member.id;
			const userName = interaction.member.user.username;
			// Delete event
			bot.helpers.deleteMessage(evtChannelId, evtMessageId, 'User deleted event').then(() => {
				dbClient.execute(queries.deleteEvent, [evtChannelId, evtMessageId]).catch((e) => utils.commonLoggers.dbError('deleteConfirmed.ts@deleteEvent', 'delete event from', e));

				// Acknowledge user so discord doesn't get annoyed
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: successColor,
							title: 'Event successfully deleted.',
							description: safelyDismissMsg,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('deleteConfirmed.ts', interaction, e));

				if (actionByManager) {
					const ownerId = BigInt(eventMessage?.embeds[0].footer?.iconUrl?.split('#')[1] || '0');
					const eventEmbed = eventMessage?.embeds[0] || { title: 'Event not found', color: failColor };
					bot.helpers.sendMessage(lfgChannelSetting.logChannelId, {
						embeds: [{
							color: infoColor2,
							title: `Event deleted by a ${config.name} Manager`,
							description: `The following event was deleted by ${userName} - <@${userId}>.`,
							timestamp: new Date().getTime(),
						}, eventEmbed],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('deleteConfirmed.ts', 'send log message', e));

					sendDirectMessage(bot, ownerId, {
						embeds: [{
							color: infoColor2,
							title: `Notice: A ${config.name} Manager has deleted one of your events in ${guildName}`,
							description: 'The deleted event is listed below.',
							fields: [
								{
									name: `${config.name} Manager:`,
									value: generateMemberList([{
										id: userId,
										name: userName,
									}]),
									inline: true,
								},
								{
									name: 'Are you unhappy with this action?',
									value: `Please reach out to the ${config.name} Manager that performed this action, or the moderators/administrators of ${guildName}.`,
								},
							],
						}, eventEmbed],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('deleteConfirmed.ts', 'send DM fail', e));
				}
			}).catch((e) => {
				utils.commonLoggers.messageDeleteError('deleteConfirmed.ts', 'deleteEventFailedDB', e);
				somethingWentWrong(bot, interaction, 'deleteEventMessageInDeleteConfirmedButton');
			});
		} else {
			// User either did not type yes confirm field was missing, lets see which it was
			if (tempDataMap.get(confirmedCustomId)) {
				// User did not type yes.
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: infoColor1,
							title: 'Event not deleted.',
							description: `If you are trying to delete the event, please make sure you type \`${confirmStr}\` into the field provided.

${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('deleteConfirmed.ts', interaction, e));
			} else {
				// Field was missing
				somethingWentWrong(bot, interaction, 'noIdsFromDeleteConfirmedButton');
			}
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromDeleteConfirmedButton');
	}
};

export const deleteConfirmedButton = {
	customId,
	execute,
};
