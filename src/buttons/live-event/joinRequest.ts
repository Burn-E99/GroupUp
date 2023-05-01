import { Bot, ButtonStyles, Interaction, InteractionResponseTypes, MessageComponentTypes } from '../../../deps.ts';
import { sendDirectMessage, somethingWentWrong, successColor, warnColor } from '../../commandUtils.ts';
import { generateMapId, getLfgMembers, joinMemberToEvent, joinRequestMap, joinRequestResponseButtons, JoinRequestStatus } from './utils.ts';
import { alternateEventBtnStr, idSeparator } from '../eventUtils.ts';
import { dbClient, queries } from '../../db.ts';
import { customId as alternateRequestCustomId } from './alternateRequest.ts';
import utils from '../../utils.ts';

export const customId = 'joinRequest';
export const approveStr = 'approved';
export const denyStr = 'denied';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (
		interaction.data?.customId && interaction.user && interaction.channelId && interaction.message && interaction.message.embeds[0] && interaction.message.embeds[0].fields &&
		interaction.message.embeds[0].description
	) {
		const memberRequesting = getLfgMembers(interaction.message.embeds[0].fields[0].value || '')[0];
		const approved = interaction.data.customId.includes(approveStr);
		const responseStr = interaction.data.customId.split(idSeparator)[1] || '';
		const capResponseStr = utils.capitalizeFirstChar(responseStr);
		const eventIds = utils.messageUrlToIds(interaction.message.embeds[0].description.split(')')[0] || '');
		const eventUrl = utils.idsToMessageUrl(eventIds);
		const joinRequestMapId = generateMapId(eventIds.messageId, eventIds.channelId, memberRequesting.id);

		// Light Telemetry
		dbClient.execute(queries.callIncCnt(approved ? 'btn-joinReqApprove' : 'btn-joinReqDeny')).catch((e) => utils.commonLoggers.dbError('joinRequest.ts', 'call sproc INC_CNT on', e));

		if (approved) {
			// If member was approved, get the event and add them to it
			const eventMessage = await bot.helpers.getMessage(eventIds.channelId, eventIds.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('joinRequest.ts', 'get eventMessage', e));
			if (eventMessage) {
				joinMemberToEvent(bot, interaction, eventMessage.embeds[0], eventIds.messageId, eventIds.channelId, memberRequesting, eventIds.guildId);
			} else {
				somethingWentWrong(bot, interaction, 'eventMissingFromJoinRequestButton');
				return;
			}
		} else {
			// If denied, send deferredUpdate so discord doesn't think we ignored the user (approved is handled in joinMemberToEvent)
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('joinRequest.ts', interaction, e));
		}

		// Update the JoinRequestMap
		joinRequestMap.set(joinRequestMapId, {
			status: approved ? JoinRequestStatus.Approved : JoinRequestStatus.Denied,
			timestamp: new Date().getTime(),
		});

		// Send DM to the requesting member to let them know of the result
		sendDirectMessage(bot, memberRequesting.id, {
			embeds: [{
				color: approved ? successColor : warnColor,
				title: `Notice: Join Request ${capResponseStr}`,
				description: `The owner of [this event](${eventUrl}), <@${interaction.user.id}>, has ${responseStr} your join request.${
					approved ? '' : '  If you would like to join the event as an alternate, please click on the button below.'
				}`,
			}],
			components: approved ? undefined : [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.Button,
					label: alternateEventBtnStr,
					style: ButtonStyles.Primary,
					customId: alternateRequestCustomId,
				}],
			}],
		}).catch((e: Error) => utils.commonLoggers.messageSendError('joinRequest.ts', 'send DM fail', e));

		// Update request DM to indicate if it was approved or denied and disable buttons
		interaction.message.embeds[0].fields.push({
			name: 'Your response:',
			value: capResponseStr,
		});
		bot.helpers.editMessage(interaction.channelId, interaction.message.id, {
			embeds: [interaction.message.embeds[0]],
			components: joinRequestResponseButtons(true),
		}).catch((e: Error) => utils.commonLoggers.messageEditError('joinRequest.ts', 'event edit fail', e));
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromJoinRequestButton');
	}
};

export const joinRequestButton = {
	customId,
	execute,
};
