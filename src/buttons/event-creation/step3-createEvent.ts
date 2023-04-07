import { Bot, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { deleteTokenEarly, generateLFGButtons, idSeparator, LfgEmbedIndexes } from './utils.ts';
import { somethingWentWrong } from '../../commandUtils.ts';
import { dbClient, queries } from '../../db.ts';
import utils from '../../utils.ts';

export const customId = 'createEvent';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (
		interaction.data?.customId && interaction.member && interaction.guildId && interaction.channelId && interaction.message && interaction.message.embeds[0] && interaction.message.embeds[0].fields
	) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt(interaction.data.customId.includes(idSeparator) ? 'btn-createWLEvt' : 'btn-createEvt')).catch((e) =>
			utils.commonLoggers.dbError('step3-createEvent.ts', 'call sproc INC_CNT on', e)
		);

		deleteTokenEarly(bot, interaction, interaction.guildId, interaction.channelId, interaction.member.id);

		// Get OwnerId and EventTime from embed for DB
		const ownerId: bigint = BigInt(interaction.message.embeds[0].footer?.iconUrl?.split('#')[1] || '0');
		const eventTime: Date = new Date(parseInt(interaction.message.embeds[0].fields[LfgEmbedIndexes.ICSLink].value.split('?t=')[1].split('&n=')[0] || '0'));

		// Send Event Message
		const eventMessage = await bot.helpers.sendMessage(interaction.channelId, {
			embeds: [interaction.message.embeds[0]],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: generateLFGButtons(interaction.data.customId.includes(idSeparator)),
			}],
		}).catch((e: Error) => utils.commonLoggers.messageSendError('step3-createEvent.ts', 'createEvent', e));
		if (!eventMessage) {
			somethingWentWrong(bot, interaction, 'creatingEventSendMessageFinalizeEventStep');
			return;
		}

		// Store in DB
		let dbErrorOut = false;
		await dbClient.execute(queries.insertEvent, [eventMessage.id, eventMessage.channelId, interaction.guildId, ownerId, eventTime]).catch((e) => {
			utils.commonLoggers.dbError('step3-createEvent.ts', 'INSERT event to DB', e);
			dbErrorOut = true;
		});
		if (dbErrorOut) {
			bot.helpers.deleteMessage(eventMessage.channelId, eventMessage.id, 'Failed to log event to DB').catch((e: Error) =>
				utils.commonLoggers.messageDeleteError('step3-createEvent.ts', 'deleteEventFailedDB', e)
			);
			somethingWentWrong(bot, interaction, 'creatingEventDBStoreFinalizeEventStep');
			return;
		}

		// Let discord know we didn't ignore the user
		bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.DeferredUpdateMessage,
		}).catch((e: Error) => utils.commonLoggers.interactionSendError('step3-createEvent.ts', interaction, e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromFinalizeEventStep');
	}
};

export const createEventButton = {
	customId,
	execute,
};
