import config from '../../config.ts';
import { ApplicationCommandFlags, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { failColor, somethingWentWrong, successColor, safelyDismissMsg } from '../commandUtils.ts';
import { dbClient, lfgChannelSettings, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';

const details: CommandDetails = {
	name: 'delete-lfg-channel',
	description: `Removes all settings from ${config.name} related to this LFG channel.  Events will not be deleted.`,
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['ADMINISTRATOR'],
};

const execute = async (bot: Bot, interaction: Interaction) => {
	dbClient.execute(queries.callIncCnt('cmd-delete')).catch((e) => utils.commonLoggers.dbError('delete.ts', 'call sproc INC_CNT on', e));

	if (interaction.guildId && interaction.channelId) {
		if (!lfgChannelSettings.has(`${interaction.guildId}-${interaction.channelId}`)) {
			// Cannot delete a lfg channel that has not been set up
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: failColor,
						title: 'Unable to delete LFG channel.',
						description:
							'This channel is already is not an LFG channel.  If you need to setup the channel, please run `/setup` in this channel.\n\nThis will not harm any active events in this channel and simply resets the settings for this channel.',
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('delete.ts', interaction, e));
			return;
		}

		// Remove it from the DB
		let dbError = false;
		await dbClient.execute('DELETE FROM guild_settings WHERE guildId = ? AND lfgChannelId = ?', [interaction.guildId, interaction.channelId]).catch((e) => {
			utils.commonLoggers.dbError('delete.ts', 'delete guild/lfgChannel', e);
			dbError = true;
		});
		if (dbError) {
			somethingWentWrong(bot, interaction, 'deleteDBDeleteFail');
			return;
		}
		lfgChannelSettings.delete(`${interaction.guildId}-${interaction.channelId}`);

		// Complete the interaction
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					color: successColor,
					title: 'LFG Channel settings removed!',
					description: `${config.name} has finished removing the settings for this channel.  ${safelyDismissMsg}`,
				}],
			},
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('delete.ts', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'deleteMissingGuildIdChannelId');
	}
};

export default {
	details,
	execute,
};
