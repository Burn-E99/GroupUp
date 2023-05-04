import config from '../../config.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	Bot,
	botId,
	ButtonStyles,
	ChannelTypes,
	DiscordEmbedField,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	OverwriteTypes,
} from '../../deps.ts';
import { failColor, infoColor2, safelyDismissMsg, somethingWentWrong, successColor } from '../commandUtils.ts';
import { dbClient, generateGuildSettingKey, lfgChannelSettings, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { customId as gameSelId } from '../buttons/event-creation/step1-gameSelection.ts';
import { alternateEventBtnStr, joinEventBtnStr, leaveEventBtnStr, LfgEmbedIndexes, requestToJoinEventBtnStr } from '../buttons/eventUtils.ts';
import { alternateName, eventLinkName, joinName, leaveName, userName } from './managerJLA.ts';
import { createEventSlashName, deleteSlashName, managerJLASlashName, reportSlashName, setupSlashName } from './slashCommandNames.ts';
import { generateLFGButtons, generateTimeFieldStr } from '../buttons/event-creation/utils.ts';
import { getLfgMembers } from '../buttons/live-event/utils.ts';

const withoutMgrRole = 'without-manager-role';
const withMgrRole = 'with-manager-role';
const managerRoleStr = 'manager-role';
const logChannelStr = 'log-channel';

const details: CommandDetails = {
	name: setupSlashName,
	description: `Configures this channel to be a dedicated event channel to be managed by ${config.name}.`,
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [
		{
			name: withoutMgrRole,
			type: ApplicationCommandOptionTypes.SubCommand,
			description: `This will configure ${config.name} without a manager role.`,
		},
		{
			name: withMgrRole,
			type: ApplicationCommandOptionTypes.SubCommand,
			description: `This will configure ${config.name} with a manager role.`,
			options: [
				{
					name: managerRoleStr,
					type: ApplicationCommandOptionTypes.Role,
					description: 'This role will be allowed to manage all events in this guild.',
					required: true,
				},
				{
					name: logChannelStr,
					type: ApplicationCommandOptionTypes.Channel,
					description: `This channel is where ${config.name} will send Audit Messages whenever a manager updates an event.`,
					required: true,
					channelTypes: [ChannelTypes.GuildText],
				},
			],
		},
	],
};

const execute = async (bot: Bot, interaction: Interaction) => {
	dbClient.execute(queries.callIncCnt('cmd-setup')).catch((e) => utils.commonLoggers.dbError('setup.ts', 'call sproc INC_CNT on', e));

	const setupOpts = interaction.data?.options?.[0];

	if (setupOpts?.name && interaction.channelId && interaction.guildId) {
		const lfgChannelSettingKey = generateGuildSettingKey(interaction.guildId, interaction.channelId);
		if (lfgChannelSettings.has(lfgChannelSettingKey)) {
			// Cannot setup a lfg channel that is already set up
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: failColor,
						title: 'Unable to setup LFG channel.',
						description:
							`This channel is already set as an LFG channel.  If you need to edit the channel, please run \`/${deleteSlashName}\` in this channel and then run \`/${setupSlashName}\` again.\n\nThis will not harm any active events in this channel and simply resets the settings for this channel.`,
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
			return;
		}

		const messages = await bot.helpers.getMessages(interaction.channelId, { limit: 100 });
		if (messages.size < 100) {
			let logChannelId = 0n;
			let managerRoleId = 0n;
			let logChannelErrorOut = false;
			let mgrRoleErrorOut = false;
			const introFields: Array<DiscordEmbedField> = [{
				name: 'Joining Events:',
				value:
					`To join an event, simply click on the \`${joinEventBtnStr}\` or \`${requestToJoinEventBtnStr}\` button.  If you try to join a full event, you will be placed in the Alternates column with an \`*\` next to your name.  Members with an \`*\` next to their name will automatically get promoted to the Joined list if someone leaves the event.`,
			}, {
				name: 'Leaving Events:',
				value: `To leave an event, simply click on the \`${leaveEventBtnStr}\` button.`,
				inline: true,
			}, {
				name: 'Joining Events as an Alternate:',
				value: `To join as a backup or indicate you might be available, simply click on the \`${alternateEventBtnStr}\` button.`,
				inline: true,
			}, {
				name: 'Editing/Deleting your event:',
				value: 'To edit or delete your event, simply click on the ✏️ or 🗑️ buttons respectively.',
			}];
			const permissionFields: Array<DiscordEmbedField> = [
				{
					name: `Please make sure ${config.name} has the following permissions:`,
					value: '`MANAGE_GUILD`\n`MANAGE_CHANNELS`\n`MANAGE_ROLES`\n`MANAGE_MESSAGES`\n\nThe only permission that is required after setup completes is `MANAGE_MESSAGES`.',
				},
			];
			if (setupOpts.name === withMgrRole) {
				if (setupOpts.options?.length) {
					setupOpts.options.forEach((opt) => {
						if (opt.name === managerRoleStr) {
							managerRoleId = BigInt(opt.value as string || '0');
						} else if (opt.name === logChannelStr) {
							logChannelId = BigInt(opt.value as string || '0');
						}
					});

					if (logChannelId === 0n || managerRoleId === 0n) {
						// One or both Ids did not get parsed
						bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
							type: InteractionResponseTypes.ChannelMessageWithSource,
							data: {
								flags: ApplicationCommandFlags.Ephemeral,
								embeds: [{
									color: failColor,
									title: 'Unable to setup log channel or manager role.',
									description:
										`${config.name} attempted to set the log channel or manager role, but one or both were undefined.  Please try again and if the issue continues, \`/${reportSlashName}\` this issue to the developers with the error code below.`,
									fields: [{
										name: 'Error Code:',
										value: `setupLog${logChannelId}Mgr${managerRoleId}`,
									}],
								}],
							},
						}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
						return;
					}
				} else {
					// Discord broke?
					somethingWentWrong(bot, interaction, 'setupMissingRoleMgrOptions');
					return;
				}
				introFields.push({
					name: `${config.name} Manager Details:`,
					value: `${config.name} Managers with the <@&${managerRoleId}> role may edit or delete events in this guild, along with using the following commands to update the activity members:

\`/${managerJLASlashName} [${joinName} | ${leaveName} | ${alternateName}] [${eventLinkName}] [${userName}]\`

The Discord Slash Command system will ensure you provide all the required details.`,
				});

				// Set permissions for self, skip if we already failed to set roles
				!logChannelErrorOut && await bot.helpers.editChannelPermissionOverrides(logChannelId, {
					id: botId,
					type: OverwriteTypes.Member,
					allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'EMBED_LINKS'],
				}).catch((e: Error) => {
					utils.commonLoggers.channelUpdateError('setup.ts', 'self-allow', e);
					mgrRoleErrorOut = true;
				});

				// Test sending a message to the logChannel
				!logChannelErrorOut && await bot.helpers.sendMessage(logChannelId, {
					embeds: [{
						title: `This is the channel ${config.name} will be logging events to.`,
						description: `${config.name} will only send messages here as frequently as your event managers update events.`,
						color: infoColor2,
					}],
				}).catch((e: Error) => {
					utils.commonLoggers.messageSendError('setup.ts', 'log-test', e);
					logChannelErrorOut = true;
				});
				if (logChannelErrorOut) {
					// Cannot send message into log channel, error out
					bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: ApplicationCommandFlags.Ephemeral,
							embeds: [{
								color: failColor,
								title: 'Unable to setup log channel.',
								description: `${config.name} attempted to send a message to the specified log channel.`,
								fields: [
									{
										name: `Please allow ${config.name} to send messages in the requested channel.`,
										value: `<#${logChannelId}>`,
									},
								],
							}],
						},
					}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
					return;
				}

				// Set permissions for managerId
				await bot.helpers.editChannelPermissionOverrides(interaction.channelId, {
					id: managerRoleId,
					type: OverwriteTypes.Role,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
				}).catch((e: Error) => {
					utils.commonLoggers.channelUpdateError('setup.ts', 'manager-allow', e);
					mgrRoleErrorOut = true;
				});
			}

			// Set permissions for everyone, skip if we already failed to set roles
			!mgrRoleErrorOut && await bot.helpers.editChannelPermissionOverrides(interaction.channelId, {
				id: interaction.guildId,
				type: OverwriteTypes.Role,
				allow: ['VIEW_CHANNEL'],
				deny: ['SEND_MESSAGES'],
			}).catch((e: Error) => {
				utils.commonLoggers.channelUpdateError('setup.ts', 'everyone-deny', e);
				mgrRoleErrorOut = true;
			});

			const x = await bot.helpers.getRoles(interaction.guildId);
			x.forEach(role => console.log(role))

			// Set permissions for self, skip if we already failed to set roles
			!mgrRoleErrorOut && await bot.helpers.editChannelPermissionOverrides(interaction.channelId, {
				id: botId,
				type: OverwriteTypes.Member,
				allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'EMBED_LINKS'],
			}).catch((e: Error) => {
				utils.commonLoggers.channelUpdateError('setup.ts', 'self-allow', e);
				mgrRoleErrorOut = true;
			});

			if (mgrRoleErrorOut) {
				// Cannot update role overrides on channel, error out
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: failColor,
							title: 'Unable to set lfg channel permissions.',
							description: `${config.name} attempted to update the permissions for the current channel, but could not.`,
							fields: permissionFields,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
				return;
			}

			// Delete all messages that are not LFG posts
			const msgsToDel: Array<bigint> = [];
			const oldLfgMsgs: Array<bigint> = [];
			messages.forEach((msg) => {
				if (msg.authorId === botId && msg.embeds.length && msg.embeds[0].footer && msg.embeds[0].footer.text.includes('Created by:')) {
					oldLfgMsgs.push(msg.id);
				} else {
					msgsToDel.push(msg.id);
				}
			});
			if (msgsToDel.length) {
				for (const msgToDel of msgsToDel) {
					await bot.helpers.deleteMessage(interaction.channelId, msgToDel, 'Initial LFG Channel Cleanup').catch((e: Error) =>
						utils.commonLoggers.messageDeleteError('setup.ts', 'bulk-msg-cleanup', e)
					);
				}
			}

			// Retrofit all old LFG posts that we found
			oldLfgMsgs.forEach((oldEventId) => {
				const oldEvent = messages.get(oldEventId);
				if (oldEvent && oldEvent.embeds[0].fields && oldEvent.embeds[0].footer) {
					const eventMembers = [...getLfgMembers(oldEvent.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].value), ...getLfgMembers(oldEvent.embeds[0].fields[LfgEmbedIndexes.AlternateMembers].value)];
					const eventDateTime = new Date(parseInt((oldEvent.embeds[0].fields[LfgEmbedIndexes.StartTime].value.split('tz#')[1] || ' ').slice(0, -1)));
					if (!isNaN(eventDateTime.getTime())) {
						const eventDateTimeStr = (oldEvent.embeds[0].fields[LfgEmbedIndexes.StartTime].value.split('](')[0] || ' ').slice(1);
						oldEvent.embeds[0].fields[LfgEmbedIndexes.StartTime].value = generateTimeFieldStr(eventDateTimeStr, eventDateTime);
						oldEvent.embeds[0].footer.text = oldEvent.embeds[0].footer.text.split(' | ')[0];
						const ownerName = oldEvent.embeds[0].footer.text.split(': ')[1];
						const ownerId = eventMembers.find((member) => ownerName === member.name)?.id || 0n;
						oldEvent.embeds[0].footer.iconUrl = `${config.links.creatorIcon}#${ownerId}`;
						bot.helpers.editMessage(oldEvent.channelId, oldEvent.id, {
							content: '',
							embeds: [oldEvent.embeds[0]],
							components: [{
								type: MessageComponentTypes.ActionRow,
								components: generateLFGButtons(false),
							}],
						}).catch((e: Error) => utils.commonLoggers.messageEditError('setup.ts', 'retrofit event', e));
						dbClient.execute(queries.insertEvent, [oldEvent.id, oldEvent.channelId, interaction.guildId, ownerId, eventDateTime]).catch((e) =>
							utils.commonLoggers.dbError('setup.ts@retrofit', 'INSERT event to DB', e)
						);
					}
				}
			});

			// Store the ids to the db
			let dbErrorOut = false;
			await dbClient.execute('INSERT INTO guild_settings(guildId,lfgChannelId,managerRoleId,logChannelId) values(?,?,?,?)', [interaction.guildId, interaction.channelId, managerRoleId, logChannelId])
				.catch((e) => {
					utils.commonLoggers.dbError('setup.ts', 'insert into guild_settings', e);
					dbErrorOut = true;
				});
			if (dbErrorOut) {
				// DB died?
				somethingWentWrong(bot, interaction, 'setupDBInsertFailed');
				return;
			}
			// Store the ids to the active map
			lfgChannelSettings.set(lfgChannelSettingKey, {
				managed: setupOpts.name === withMgrRole,
				managerRoleId,
				logChannelId,
			});

			// Send the initial introduction message
			const createNewEventBtn = 'Create New Event';
			const introMsg = await bot.helpers.sendMessage(interaction.channelId, {
				content: `Welcome to <#${interaction.channelId}>, managed by <@${botId}>!`,
				embeds: [{
					title: `To get started, click on the '${createNewEventBtn}' button below!`,
					color: infoColor2,
					fields: introFields,
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.Button,
						label: createNewEventBtn,
						customId: gameSelId,
						style: ButtonStyles.Success,
					}],
				}],
			}).catch((e: Error) => utils.commonLoggers.messageSendError('setup.ts', 'init-msg', e));

			if (introMsg) {
				bot.helpers.pinMessage(interaction.channelId, introMsg.id).catch((e: Error) => utils.commonLoggers.messageSendError('setup.ts', 'pin-init-msg', e));
				// Complete the interaction
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: successColor,
							title: 'LFG Channel setup complete!',
							description: `${config.name} has finished setting up this channel.  ${safelyDismissMsg}`,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
			} else {
				// Could not send initial message
				bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							color: failColor,
							title: 'Failed to send the initial message!',
							fields: permissionFields,
						}],
					},
				}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
			}
		} else {
			// Too many messages to delete, give up
			bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						color: failColor,
						title: 'Unable to setup LFG channel.',
						description: `${config.name} attempted to clean this channel, but encountered too many messages (100 or more).  There are two ways to move forward:`,
						fields: [
							{
								name: 'Is this channel a dedicated LFG Channel?',
								value: 'You either need to manually clean this channel or create a brand new channel for events.',
								inline: true,
							},
							{
								name: 'Is this a chat channel that you want events mixed into?',
								value: `You do not need to run the \`/${setupSlashName}\` command, and instead should use the \`/${createEventSlashName}\` command.`,
								inline: true,
							},
						],
					}],
				},
			}).catch((e: Error) => utils.commonLoggers.interactionSendError('setup.ts', interaction, e));
		}
	} else {
		// Discord fucked up?
		somethingWentWrong(bot, interaction, 'setupMissingAllOptions');
	}
};

export default {
	details,
	execute,
};
