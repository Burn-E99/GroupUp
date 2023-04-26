import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { safelyDismissMsg, somethingWentWrong, successColor } from '../../commandUtils.ts';
import { idSeparator, pathIdxEnder, pathIdxSeparator } from '../eventUtils.ts';
import { deleteTokenEarly } from '../tokenCleanup.ts';
import utils from '../../utils.ts';
import { dbClient, queries } from '../../db.ts';
import { generateLFGButtons } from '../event-creation/utils.ts';

export const customId = 'toggleWLStatus';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.customId && interaction.member && interaction.channelId && interaction.guildId) {
		deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);
		const makeWhitelisted = interaction.data.customId.endsWith(pathIdxEnder);
		dbClient.execute(queries.callIncCnt(makeWhitelisted ? 'btn-eeMakeWL' : 'btn-eeMakePublic')).catch((e) => utils.commonLoggers.dbError('toggleWLStatus.ts', 'call sproc INC_CNT on', e));
		const [evtChannelId, evtMessageId] = (interaction.data.customId.replaceAll(pathIdxEnder, '').split(idSeparator)[1] || '').split(pathIdxSeparator).map((id) => BigInt(id || '0'));

		// TODO: verify we can DM owner before applying update
		bot.helpers.editMessage(evtChannelId, evtMessageId, {
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: generateLFGButtons(makeWhitelisted),
			}],
		}).then(() =>
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: successColor,
						title: 'Update successfully applied.',
						description: `This event is now ${makeWhitelisted ? 'whitelisted, meaning you will have to approve join requests from all future members' : 'public'}.\n\n${safelyDismissMsg}`,
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('toggleWLStatus.ts', interaction, e))
		).catch((e) => {
			utils.commonLoggers.messageEditError('toggleWLStatus.ts', 'toggleWLStatusFailed', e);
			somethingWentWrong(bot, interaction, 'editFailedInToggleWLStatusButton');
		});
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromToggleWLStatusButton');
	}
};

export const toggleWLStatusButton = {
	customId,
	execute,
};
