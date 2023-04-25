import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes, TextStyles } from '../../../deps.ts';
import { dbClient, generateGuildSettingKey, lfgChannelSettings, queries } from '../../db.ts';
import { somethingWentWrong, stopThat } from '../../commandUtils.ts';
import { idSeparator, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { confirmedCustomId, confirmStr, customId as deleteConfirmedCustomId } from './deleteConfirmed.ts';
import utils from '../../utils.ts';

export const customId = 'deleteEvent';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.member.user && interaction.channelId && interaction.guildId && interaction.message && interaction.message.embeds[0]) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt('btn-delEvent')).catch((e) => utils.commonLoggers.dbError('deleteEvent.ts', 'call sproc INC_CNT on', e));

		const ownerId = BigInt(interaction.message.embeds[0].footer?.iconUrl?.split('#')[1] || '0');
		const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || {
			managed: false,
			managerRoleId: 0n,
			logChannelId: 0n,
		};

		// Make sure this is being done by the owner or a Group Up Manager
		if (interaction.member.user.id === ownerId || (lfgChannelSetting.managed && interaction.member.roles.includes(lfgChannelSetting.managerRoleId))) {
			const actionByManager = interaction.member.user.id !== ownerId;
			// Open Delete Confirmation
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.Modal,
				data: {
					title: 'Are you sure you want to delete this event?',
					customId: `${deleteConfirmedCustomId}${idSeparator}${interaction.channelId}${pathIdxSeparator}${interaction.message.id}${actionByManager ? pathIdxEnder : ''}`,
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.InputText,
							customId: confirmedCustomId,
							label: `To confirm, type '${confirmStr}' in the field below:`,
							placeholder: 'To cancel, just click cancel on this modal.',
							style: TextStyles.Short,
							minLength: 3,
							maxLength: 3,
						}],
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('step1a-openCustomModal.ts:modal', interaction, e));
		} else {
			// Not owner or manager, tell user they can't
			stopThat(bot, interaction, 'delete');
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromDeleteEventButton');
	}
};

export const deleteEventButton = {
	customId,
	execute,
};
