import { ApplicationCommandFlags, ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { alternateMemberToEvent, getGuildName, joinMemberToEvent, removeMemberFromEvent } from '../buttons/live-event/utils.ts';
import { generateMemberList } from '../buttons/eventUtils.ts';
import { dbClient } from '../db/client.ts';
import { generateGuildSettingKey, lfgChannelSettings, queries } from '../db/common.ts';
import { infoColor2, safelyDismissMsg, sendDirectMessage, somethingWentWrong, stopThat, warnColor } from '../commandUtils.ts';
import { CommandDetails, LFGMember } from '../types/commandTypes.ts';
import config from '../../config.ts';
import utils from '../utils.ts';
import { managerJLASlashName } from './slashCommandNames.ts';

export const joinName = 'join';
export const leaveName = 'leave';
export const alternateName = 'alternate';
export const eventLinkName = 'event-link';
export const userName = 'user';

// Create command with three nearly identical subcommands
const generateOptions = (commandName: string) => ({
	name: commandName,
	description: `${config.name} Manager Command: ${utils.capitalizeFirstChar(commandName)}s a user to an event in this channel.`,
	type: ApplicationCommandOptionTypes.SubCommand,
	options: [
		{
			name: eventLinkName,
			type: ApplicationCommandOptionTypes.String,
			description: 'Please copy the message link for the desired event.',
			required: true,
			minLength: 31,
			maxLength: 100,
		},
		{
			name: userName,
			type: ApplicationCommandOptionTypes.User,
			description: `The user you wish to ${commandName}.`,
			required: true,
		},
	],
});
const details: CommandDetails = {
	name: managerJLASlashName,
	description: `${config.name} Manager Command`,
	type: ApplicationCommandTypes.ChatInput,
	options: [generateOptions(joinName), generateOptions(leaveName), generateOptions(alternateName)],
};

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.data?.options?.[0].options && interaction.channelId && interaction.guildId && interaction?.member?.user) {
		// Get action and log to db
		const actionName = interaction.data.options[0].name;
		dbClient.execute(queries.callIncCnt(`cmd-${actionName}`)).catch((e) => utils.commonLoggers.dbError('managerJLA.ts', 'call sproc INC_CNT on', e));
		const lfgChannelSetting = lfgChannelSettings.get(generateGuildSettingKey(interaction.guildId, interaction.channelId)) || {
			managed: false,
			managerRoleId: 0n,
			logChannelId: 0n,
		};

		// Check if guild is managed and if user is a manager
		if (lfgChannelSetting.managed && interaction.member.roles.includes(lfgChannelSetting.managerRoleId)) {
			// User is a manager, parse out our data
			const tempDataMap: Map<string, string> = new Map();
			for (const option of interaction.data.options[0].options) {
				tempDataMap.set(option.name || 'missingCustomId', option.value as string || '');
			}
			const eventLink = tempDataMap.get(eventLinkName) ?? '';
			const userToAdd = BigInt(tempDataMap.get(userName) ?? '0');
			const eventIds = utils.messageUrlToIds(eventLink);

			// Verify fields exist
			if (!eventLink || !userToAdd || !eventIds.guildId || !eventIds.channelId || !eventIds.messageId) {
				somethingWentWrong(bot, interaction, 'missingLinkOrUserInManagerJLA');
				return;
			}

			// Get event from link
			const eventMessage = await bot.helpers.getMessage(eventIds.channelId, eventIds.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('managerJLA.ts', 'get eventMessage', e));

			// Prevent managers from adding people to locked events
			if (eventMessage && !eventMessage.components?.length) {
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: warnColor,
							title: 'Hey!  Stop that!',
							description: `You are not allowed to ${actionName} users to an event that has already started.

${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('commandUtils.ts@stopThat', interaction, e));
				return;
			}

			const userDetails = await bot.helpers.getUser(userToAdd).catch((e: Error) => utils.commonLoggers.messageGetError('managerJLA.ts', 'get userDetails', e));
			if (eventMessage && userDetails) {
				// Perform the action
				const userInfo: LFGMember = {
					id: userToAdd,
					name: userDetails.username,
				};
				let changeMade = false;
				switch (actionName) {
					case joinName:
						changeMade = await joinMemberToEvent(bot, interaction, eventMessage.embeds[0], eventIds.messageId, eventIds.channelId, userInfo, eventIds.guildId, true);
						break;
					case leaveName:
						changeMade = await removeMemberFromEvent(bot, interaction, eventMessage.embeds[0], eventIds.messageId, eventIds.channelId, userToAdd, eventIds.guildId, true);
						break;
					case alternateName:
						changeMade = await alternateMemberToEvent(bot, interaction, eventMessage.embeds[0], eventIds.messageId, eventIds.channelId, userInfo, false, true);
						break;
					default:
						somethingWentWrong(bot, interaction, 'actionNameWrongManagerJLA');
						break;
				}

				if (changeMade) {
					// userToAdd was had JLA done to them, DM them with details\
					const guildName = await getGuildName(bot, interaction.guildId);
					const commonFields = [{
						name: 'Event Link:',
						value: `[Click Here](${eventLink}) to view the event.`,
						inline: true,
					}, {
						name: 'Action Performed:',
						value: utils.capitalizeFirstChar(actionName),
						inline: true,
					}];
					sendDirectMessage(bot, userToAdd, {
						embeds: [{
							color: infoColor2,
							title: `Notice: A ${config.name} Manager has performed an action for you in ${guildName}`,
							fields: [
								{
									name: `${config.name} Manager:`,
									value: generateMemberList([{
										id: interaction.member.id,
										name: interaction.member.user.username,
									}]),
									inline: true,
								},
								...commonFields,
								{
									name: 'Are you unhappy with this action?',
									value: `Please reach out to the ${config.name} Manager that performed this action, or the moderators/administrators of ${guildName}.`,
								},
							],
						}],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('managerJLA.ts', 'send DM fail', e));

					// Log this action
					bot.helpers.sendMessage(lfgChannelSetting.logChannelId, {
						embeds: [{
							color: infoColor2,
							title: `A ${config.name} Manager has performed an action on behalf of a user.`,
							description: `The following user had an action by ${interaction.member.user.username} - <@${interaction.member.id}>.`,
							fields: [...commonFields, {
								name: 'User:',
								value: generateMemberList([userInfo]),
								inline: true,
							}],
							timestamp: new Date().getTime(),
						}],
					}).catch((e: Error) => utils.commonLoggers.messageSendError('deleteConfirmed.ts', 'send log message', e));
				}
			} else {
				somethingWentWrong(bot, interaction, 'eventOrUserMissingFromManagerJLA');
			}
		} else {
			// User not a manager
			stopThat(bot, interaction, `${actionName} users to`);
		}
	} else {
		// All data missing
		somethingWentWrong(bot, interaction, 'missingDataInManagerJLA');
	}
};

export default {
	details,
	execute,
};
