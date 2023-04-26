import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { failColor, infoColor1, infoColor2, safelyDismissMsg, sendDirectMessage, somethingWentWrong, successColor } from '../../commandUtils.ts';
import { generateMemberList, idSeparator, LfgEmbedIndexes, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import config from '../../../config.ts';
import { dbClient, generateGuildSettingKey, lfgChannelSettings, queries } from '../../db.ts';
import { getGuildName } from './utils.ts';

export const customId = 'updateEvent';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member?.user && interaction.channelId && interaction.guildId && interaction.message?.embeds[0].fields) {
		deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

		const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || {
			managed: false,
			managerRoleId: 0n,
			logChannelId: 0n,
		};
		const actionByManager = interaction.data.customId.endsWith(pathIdxEnder);
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));
		const eventTime: Date = new Date(parseInt(interaction.message.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.split('?t=')[1].split('&n=')[0] || '0'));
		const guildName = await getGuildName(bot, interaction.guildId);
		const oldEventEmbed = (await bot.helpers.getMessage(evtChannelId, evtMessageId).catch((e: Error) => utils.commonLoggers.messageGetError('updateEvent.ts', 'get eventMessage', e)))?.embeds[0];
		const newEventEmbed = interaction.message.embeds[0];
		const userId = interaction.member.id;
		const userName = interaction.member.user.username;

		bot.helpers.editMessage(evtChannelId, evtMessageId, { embeds: [interaction.message.embeds[0]] }).then(() => {
			dbClient.execute(queries.updateEvent, [eventTime, evtChannelId, evtMessageId]).then(() => {
				// Acknowledge user so discord doesn't get annoyed
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: successColor,
							title: 'Update successfully applied.',
							description: safelyDismissMsg,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('updateEvent.ts', interaction, e));

				if (actionByManager) {
					const ownerId = BigInt(oldEventEmbed?.footer?.iconUrl?.split('#')[1] || '0');
					const missingOldEmbed = { title: 'Failed to get old event', color: failColor };
					if (oldEventEmbed) {
						oldEventEmbed.color = infoColor1;
					}
					bot.helpers.sendMessage(lfgChannelSetting.logChannelId, {
						embeds: [
							{
								color: infoColor2,
								title: `Event edited by a ${config.name} Manager`,
								description: `The following event was edited by ${userName} - <@${userId}>.  The old event is listed first and marked with a blue bar.`,
								timestamp: new Date().getTime(),
							},
							oldEventEmbed || missingOldEmbed,
							newEventEmbed,
						],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('updateEvent.ts', 'send log message', e));

					sendDirectMessage(bot, ownerId, {
						embeds: [
							{
								color: infoColor2,
								title: `Notice: A ${config.name} Manager has edited one of your events in ${guildName}`,
								description: 'The edited event is listed below.  The old event is listed first and marked with a blue bar.',
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
							},
							oldEventEmbed || missingOldEmbed,
							newEventEmbed,
						],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('managerJLA.ts', 'send DM fail', e));
				}
			}).catch((e) => {
				utils.commonLoggers.dbError('updateEvent.ts', 'update event in', e);
				if (oldEventEmbed) {
					bot.helpers.editMessage(evtChannelId, evtMessageId, { embeds: [oldEventEmbed] }).catch((e) => utils.commonLoggers.messageEditError('updateEvent.ts', 'resetEventFailed', e));
				}
				somethingWentWrong(bot, interaction, 'updateDBInUpdateEventButton');
			});
		}).catch((e) => {
			utils.commonLoggers.messageEditError('updateEvent.ts', 'updateEventFailed', e);
			somethingWentWrong(bot, interaction, 'updateEventMessageInUpdateEventButton');
		});
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromUpdateEvent');
	}
};

export const updateEventButton = {
	customId,
	execute,
};
