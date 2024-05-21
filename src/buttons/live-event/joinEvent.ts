import { ApplicationCommandFlags, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { dbClient } from '../../db/client.ts';
import { generateGuildSettingKey, lfgChannelSettings, queries } from '../../db/common.ts';
import { infoColor1, safelyDismissMsg, sendDirectMessage, somethingWentWrong, successColor, warnColor } from '../../commandUtils.ts';
import { generateMemberList, idSeparator, LfgEmbedIndexes } from '../eventUtils.ts';
import utils from '../../utils.ts';
import config from '../../../config.ts';
import { generateMapId, getGuildName, getLfgMembers, joinMemberToEvent, joinRequestMap, joinRequestResponseButtons, JoinRequestStatus } from './utils.ts';

export const customId = 'joinEvent';

const execute = async (bot: Bot, interaction: Interaction) => {
	if (
		interaction.data?.customId && interaction?.member?.user && interaction.channelId && interaction.guildId && interaction?.message?.embeds?.[0]?.fields
	) {
		// Light Telemetry
		dbClient.execute(queries.callIncCnt(interaction.data.customId.includes(idSeparator) ? 'btn-joinWLEvent' : 'btn-joinEvent')).catch((e) =>
			utils.commonLoggers.dbError('joinEvent.ts', 'call sproc INC_CNT on', e)
		);
		const ownerId = BigInt(interaction.message.embeds[0].footer?.iconUrl?.split('#')[1] || '0');
		const memberId = interaction.member.id;

		// Check if event is whitelisted
		if (interaction.data.customId.includes(idSeparator) && memberId !== ownerId) {
			// Initialize WL vars
			const joinRequestKey = generateMapId(interaction.message.id, interaction.channelId, memberId);
			const messageUrl = utils.idsToMessageUrl({
				guildId: interaction.guildId,
				channelId: interaction.channelId,
				messageId: interaction.message.id,
			});
			const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || { managed: false };
			const urgentManagerStr = lfgChannelSetting.managed ? ` a ${config.name} Manager (members with the <@&${lfgChannelSetting.managerRoleId}> role in this guild) or ` : ' ';
			const eventMembers = getLfgMembers(interaction.message.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].value);

			if (eventMembers.find((lfgMember) => lfgMember.id === memberId)) {
				// User is already joined to event, block request
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: warnColor,
							title: 'Notice: Request Blocked',
							description: `To reduce spam, ${config.name} has blocked this request to join as you have already joined this event.

${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('joinEvent.ts@userAlreadyJoined', interaction, e));
			} else if (joinRequestMap.has(joinRequestKey)) {
				// User has already sent request, block new one
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: warnColor,
							title: 'Notice: Request Blocked',
							description: `To reduce spam, ${config.name} has blocked this request to join as you have recently sent a request for this event.

If this request is urgent, please speak with${urgentManagerStr}the owner of [this event](${messageUrl}), <@${ownerId}>, to resolve the issue.

The status of your recent Join Request for [this event](${messageUrl}) is: \`${joinRequestMap.get(joinRequestKey)?.status ?? 'Failed to retrieve status'}\`

${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('joinEvent.ts@requestBlocked', interaction, e));
			} else {
				const guildName = await getGuildName(bot, interaction.guildId);
				// User is not joined and this is first request, send the Join Request
				sendDirectMessage(bot, ownerId, {
					embeds: [{
						color: infoColor1,
						title: 'New Join Request!',
						description: `A member has requested to join [your event](${messageUrl}) in \`${guildName}\`.  Please use the buttons below this message to Approve or Deny the request.`,
						fields: [{
							name: 'Member Details:',
							value: generateMemberList([{
								id: memberId,
								name: interaction.member.user.username,
							}]),
						}],
					}],
					components: joinRequestResponseButtons(false),
				}).then(() => {
					// Alert requester that join request has been sent
					bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: ApplicationCommandFlags.Ephemeral,
							embeds: [{
								color: successColor,
								title: 'Notice: Request Received',
								description: `The owner of [this event](${messageUrl}), <@${ownerId}>, has been notified of your request.  You will receive a Direct Message when <@${ownerId}> responds to the request.

${safelyDismissMsg}`,
							}],
						},
					}).catch((e: Error) => utils.commonLoggers.interactionSendError('joinEvent.ts@requestReceived', interaction, e));

					// Track the request to prevent spam
					joinRequestMap.set(joinRequestKey, {
						status: JoinRequestStatus.Pending,
						timestamp: new Date().getTime(),
					});
				}).catch((e: Error) => {
					somethingWentWrong(bot, interaction, 'failedToDMOwnerInRequestToJoinEventButton', `${config.name} could not message <@${ownerId}>.  This likely means <@${ownerId}> has turned off DMs.`);
					utils.commonLoggers.messageSendError('joinEvent.ts@dmOwner', 'failed to DM owner for join request', e);
				});
			}
		} else {
			// Join user to event
			joinMemberToEvent(bot, interaction, interaction.message.embeds[0], interaction.message.id, interaction.channelId, {
				id: memberId,
				name: interaction.member.user.username,
			}, interaction.guildId);
		}
	} else {
		somethingWentWrong(bot, interaction, 'noDataFromJoinEventButton');
	}
};

export const joinEventButton = {
	customId,
	execute,
};
