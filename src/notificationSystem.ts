import config from '../config.ts';
import { Bot } from '../deps.ts';
import { LfgEmbedIndexes } from './buttons/eventUtils.ts';
import { getEventMemberCount, getGuildName, getLfgMembers } from './buttons/live-event/utils.ts';
import { failColor, infoColor1, sendDirectMessage, warnColor } from './commandUtils.ts';
import { dbClient, queries } from './db.ts';
import { ActiveEvent } from './types/commandTypes.ts';
import utils from './utils.ts';

const notifyStepName = 'notify';
const lockStepName = 'lock';
const deleteStepName = 'delete';

export const tenMinutes = 10 * 60 * 1000;

// Join strings with english in mind
const joinWithAnd = (words: string[]) => {
	if (words.length === 0) {
		return '';
	} else if (words.length === 1) {
		return words[0];
	} else if (words.length === 2) {
		return words.join(' and ');
	} else {
		return words.slice(0, -1).join(', ') + ', and ' + words.slice(-1);
	}
};

// Log the failure in a loud sense
const loudLogFailure = async (bot: Bot, event: ActiveEvent, stepName: string, secondFailure = false) => {
	const guildName = await getGuildName(bot, event.guildId);
	const eventUrl = utils.idsToMessageUrl({
		guildId: event.guildId,
		channelId: event.channelId,
		messageId: event.messageId,
	});

	// Try to DM owner if this is the second time it has failed
	let dmSuccess = false;
	if (secondFailure) {
		const msg = await sendDirectMessage(bot, event.ownerId, {
			embeds: [{
				color: failColor,
				title: `Attention: Failed to ${stepName} one of your events`,
				description:
					`${config.name} tried twice to find [this event](${eventUrl}) in ${guildName}, and could not either time.  Since ${config.name} has failed twice, ${config.name} has now removed [this event](${eventUrl}) from its list of active events.

[This event](${eventUrl}) was scheduled to start at <t:${event.eventTime.getTime() / 1000}:F>.

The message containing this event may have been deleted by a moderator or administrator in ${guildName}.  If [the event](${eventUrl}) still exists when you click on the link above, please \`/report\` this issue to the developers with the full error code below.`,
				fields: [{
					name: 'Error Code:',
					value: `\`loudLog@${event.guildId}|${event.channelId}|${event.messageId}|${event.ownerId}|${event.eventTime.getTime()}|${event.notifiedFlag}|${event.lockedFlag}@\``,
				}],
			}],
		}).catch((e: Error) => utils.commonLoggers.messageSendError('notificationSystem.ts@loudLog', 'send DM fail', e));
		dmSuccess = Boolean(msg);
	}

	// Log this to bot's log channel
	bot.helpers.sendMessage(config.logChannel, {
		content: secondFailure ? `Hey <@${config.owner}>, something may have gone wrong.  The owner of this event was ${dmSuccess ? 'SUCCESSFULLY' : 'NOT'} notified.` : undefined,
		embeds: [{
			color: secondFailure ? failColor : warnColor,
			title: `Failed to ${stepName} an event in ${guildName}.  This is the ${secondFailure ? 'second' : 'first'} attempt.`,
			description: `${config.name} failed to ${stepName} [this event](${eventUrl}).\n\nDebug Data:`,
			fields: [{
				name: 'Guild ID:',
				value: `${event.guildId}`,
				inline: true,
			}, {
				name: 'Channel ID:',
				value: `${event.channelId}`,
				inline: true,
			}, {
				name: 'Message ID:',
				value: `${event.messageId}`,
				inline: true,
			}, {
				name: 'Owner ID:',
				value: `${event.ownerId}`,
				inline: true,
			}, {
				name: 'Event Time:',
				value: `<t:${event.eventTime.getTime() / 1000}:F>`,
				inline: true,
			}, {
				name: 'Notified Flag:',
				value: `${event.notifiedFlag}`,
				inline: true,
			}, {
				name: 'Locked Flag:',
				value: `${event.lockedFlag}`,
				inline: true,
			}],
		}],
	}).catch((e: Error) => utils.commonLoggers.messageSendError('notificationSystem.ts@loudLog', 'send log message', e));
};

// Notifies all members of the event and edits the event message
export const notifyEventMembers = async (bot: Bot, event: ActiveEvent, secondTry = false): Promise<boolean> => {
	const eventMessage = await bot.helpers.getMessage(event.channelId, event.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('notificationSystem.ts@notify', 'get event', e));
	if (eventMessage?.embeds[0].fields) {
		const activityName = `\`${eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].name} ${eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].value}\``;
		const members = getLfgMembers(eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].value);
		const memberMentionString = joinWithAnd(members.map((member) => `<@${member.id}>`));
		const guildName = await getGuildName(bot, event.guildId);

		// Edit event in guild
		await bot.helpers.editMessage(event.channelId, event.messageId, {
			content: `Attention ${memberMentionString}, your ${activityName} starts in less than 10 minutes.`,
		}).catch((e: Error) => utils.commonLoggers.messageEditError('notificationSystem.ts@notify', 'event edit fail', e));

		// Send the notifications to the members
		members.forEach(async (member) => {
			await sendDirectMessage(bot, member.id, {
				embeds: [{
					color: infoColor1,
					title: `Hello ${member.name}!  Your activity in ${guildName} starts in less than 10 minutes.`,
					description: 'Please start grouping up with the other members of this activity:',
				}, eventMessage.embeds[0]],
			}).catch((e: Error) => utils.commonLoggers.messageSendError('notificationSystem.ts@notify', 'send DM fail', e));
		});

		// Update DB to indicate notifications have been sent out
		dbClient.execute(queries.updateEventFlags(1, 0), [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@notifySuccess', 'update event in', e));
		return true;
	} else {
		if (!secondTry) loudLogFailure(bot, event, notifyStepName);
		// Update DB to indicate notifications have not been sent out
		dbClient.execute(queries.updateEventFlags(-1, 0), [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@notifyFail', 'update event in', e));
		return false;
	}
};

// Locks the event message and notifies alternates if necessary
export const lockEvent = async (bot: Bot, event: ActiveEvent, secondTry = false): Promise<boolean> => {
	const eventMessage = await bot.helpers.getMessage(event.channelId, event.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('notificationSystem.ts@lock', 'get event', e));
	if (eventMessage?.embeds[0].fields) {
		const [currentMemberCount, maxMemberCount] = getEventMemberCount(eventMessage.embeds[0].fields[LfgEmbedIndexes.JoinedMembers].name);
		const alternates = getLfgMembers(eventMessage.embeds[0].fields[LfgEmbedIndexes.AlternateMembers].value);
		const memberMentionString = joinWithAnd(alternates.map((member) => `<@${member.id}>`));

		// See if event was filled or not, and if not notify alternates
		const alternatesNeeded = alternates.length && currentMemberCount < maxMemberCount;
		if (alternatesNeeded) {
			const activityName = `\`${eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].name} ${eventMessage.embeds[0].fields[LfgEmbedIndexes.Activity].value}\``;
			const guildName = await getGuildName(bot, event.guildId);
			const peopleShort = maxMemberCount - currentMemberCount;

			// Send the notifications to the members
			alternates.forEach(async (member) => {
				await sendDirectMessage(bot, member.id, {
					embeds: [{
						color: infoColor1,
						title: `Hello ${member.name}!  An activity in ${guildName} may need your help.`,
						description: `The ${activityName} in ${guildName} that you marked yourself as an alternate for may be \`${peopleShort}\` ${
							peopleShort === 1 ? 'person' : 'people'
						} short.  If you are available, please join up with them.`,
					}, eventMessage.embeds[0]],
				}).catch((e: Error) => utils.commonLoggers.messageSendError('notificationSystem.ts@lock', 'send DM fail', e));
			});
		}

		// Edit event in guild
		await bot.helpers.editMessage(
			event.channelId,
			event.messageId,
			alternatesNeeded
				? {
					content: `${eventMessage.content}\n\nAttention ${memberMentionString}, this activity is \`${maxMemberCount - currentMemberCount}\` people short.  Please join up if you are available.`,
					components: [],
				}
				: {
					components: [],
				},
		).catch((e: Error) => utils.commonLoggers.messageEditError('notificationSystem.ts@lock', 'event edit fail', e));

		// Update DB to indicate event has been locked
		dbClient.execute(queries.updateEventFlags(1, 1), [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@lockSuccess', 'update event in', e));
		return true;
	} else {
		if (!secondTry) loudLogFailure(bot, event, lockStepName);
		// Update DB to indicate event has not been locked
		dbClient.execute(queries.updateEventFlags(1, -1), [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@lockFail', 'update event in', e));
		return false;
	}
};

// Notifies all members of the event and edits the event message
export const deleteEvent = async (bot: Bot, event: ActiveEvent, secondTry = false): Promise<boolean> => {
	const eventMessage = await bot.helpers.getMessage(event.channelId, event.messageId).catch((e: Error) => utils.commonLoggers.messageGetError('notificationSystem.ts@delete', 'get event', e));
	if (eventMessage?.embeds[0].fields) {
		// Delete event in guild
		await bot.helpers.deleteMessage(event.channelId, event.messageId, 'Cleaning up activity that has started').catch((e: Error) =>
			utils.commonLoggers.messageDeleteError('notificationSystem.ts@delete', 'event delete fail', e)
		);

		// Remove event from DB
		dbClient.execute(queries.deleteEvent, [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@deleteSuccess', 'delete event from', e));
		return true;
	} else {
		if (!secondTry) loudLogFailure(bot, event, deleteStepName);
		// Update DB to indicate delete failed
		dbClient.execute(queries.updateEventFlags(-1, -1), [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@deleteFail', 'update event in', e));
		return false;
	}
};

// Handles trying again once and cleaning up events that died
export const handleFailures = async (bot: Bot, event: ActiveEvent) => {
	let rerunSuccess: boolean;
	let stepName: string;
	// Retry the step that failed
	if (event.notifiedFlag === -1 && event.lockedFlag === -1) {
		rerunSuccess = await deleteEvent(bot, event, true);
		stepName = deleteStepName;
	} else if (event.lockedFlag === -1) {
		rerunSuccess = await lockEvent(bot, event, true);
		stepName = lockStepName;
	} else if (event.notifiedFlag === -1) {
		rerunSuccess = await notifyEventMembers(bot, event, true);
		stepName = notifyStepName;
	} else {
		// Should never get here as this func should only be called when event has one of the flags as -1
		// Set flag to true since it already succeeded?
		rerunSuccess = true;
		stepName = '';
	}

	if (!rerunSuccess) {
		// Failed at completing a step!  Event may have been deleted?
		loudLogFailure(bot, event, stepName, true);
		dbClient.execute(queries.deleteEvent, [event.channelId, event.messageId]).catch((e) => utils.commonLoggers.dbError('notificationSystem.ts@handleFailures', 'delete event from', e));
	}
};
