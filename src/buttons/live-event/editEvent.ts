import { ActionRow, ApplicationCommandFlags, Bot, ButtonStyles, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { dbClient, generateGuildSettingKey, lfgChannelSettings, queries } from '../../db.ts';
import { infoColor1, somethingWentWrong, stopThat } from '../../commandUtils.ts';
import { idSeparator, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { addTokenToMap, selfDestructMessage } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { customId as editDescriptionCustomId } from './editDescription.ts';
import { customId as editDateTimeCustomId } from './editDateTime.ts';
import { customId as toggleWLStatusCustomId } from './toggleWLStatus.ts';

export const customId = 'editEvent';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (
		interaction.data?.customId && interaction.member && interaction.channelId && interaction.guildId && interaction.message && interaction.message.components &&
		interaction.message.components[0].components
	) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-editEvent')).catch((e) => utils.commonLoggers.dbError('editEvent.ts', 'call sproc INC_CNT on', e));

		const ownerId = BigInt(interaction.message.embeds[0].footer?.iconUrl?.split('#')[1] || '0');
		const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || {
			managed: false,
			managerRoleId: 0n,
			logChannelId: 0n,
		};

		// Make sure this is being done by the owner or a Group Up Manager
		if (interaction.member.id === ownerId || (lfgChannelSetting.managed && interaction.member.roles.includes(lfgChannelSetting.managerRoleId))) {
			const actionByManager = interaction.member.id !== ownerId;
			const baseEditIdxPath = `${idSeparator}${interaction.channelId}${pathIdxSeparator}${interaction.message.id}`;
			const editIdxPath = `${baseEditIdxPath}${actionByManager ? pathIdxEnder : ''}`;
			const whitelistedEvent = interaction.message.components[0].components.some((component) => component.customId?.includes(idSeparator));

			// Store token for later use
			addTokenToMap(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

			const editButtons: ActionRow = {
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.Button,
					label: 'Change Activity',
					style: ButtonStyles.Primary,
					customId: `a${editIdxPath}`, // TODO: add customId
				}, {
					type: MessageComponentTypes.Button,
					label: 'Change Date/Time',
					style: ButtonStyles.Primary,
					customId: `${editDateTimeCustomId}${editIdxPath}`,
				}, {
					type: MessageComponentTypes.Button,
					label: 'Edit Description',
					style: ButtonStyles.Primary,
					customId: `${editDescriptionCustomId}${editIdxPath}`,
				}],
			};
			if (!actionByManager) {
				editButtons.components.push(
					whitelistedEvent
						? {
							type: MessageComponentTypes.Button,
							label: 'Make Event Public',
							style: ButtonStyles.Primary,
							customId: `${toggleWLStatusCustomId}${baseEditIdxPath}`, // TODO: add customId
						}
						: {
							type: MessageComponentTypes.Button,
							label: 'Make Event Whitelisted',
							style: ButtonStyles.Primary,
							customId: `${toggleWLStatusCustomId}${baseEditIdxPath}${pathIdxEnder}`, // TODO: add customId
						},
				);
			}

			// Open Edit Options
			bot.helpers.sendInteractionResponse(
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: infoColor1,
							title: 'Edit Menu',
							description: `Now editing [this event](${
								utils.idsToMessageUrl({
									guildId: interaction.guildId,
									channelId: interaction.channelId,
									messageId: interaction.message.id,
								})
							}).  Please select an option below.

${selfDestructMessage(new Date().getTime())}`,
						}],
						components: [editButtons],
					},
				},
			).catch((e: Error) => utils.commonLoggers.interactionSendError('editEvent.ts', interaction, e));
		} else {
			// Not owner or manager, tell user they can't
			stopThat(bot, interaction, 'edit');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromEditEventButton');
	}
};

export const editEventButton = {
	customId,
	execute,
};
