import { ActivityTypes, Bot, BotWithCache, log, LT } from '../../deps.ts';
import config from '../../config.ts';
import { LOCALMODE } from '../../flags.ts';
import { getRandomStatus, successColor } from '../commandUtils.ts';
import { ActiveEvent } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { dbClient, queries } from '../db.ts';
import { deleteEvent, handleFailures, lockEvent, notifyEventMembers, tenMinutes } from '../notificationSystem.ts';
import { updateBotListStatistics } from '../botListPoster.ts';

// Storing intervalIds in case bot soft reboots to prevent multiple of these intervals from stacking
let notificationIntervalId: number;
let botStatusIntervalId: number;
let botListPosterIntervalId: number;

export const ready = (rawBot: Bot) => {
	const bot = rawBot as BotWithCache;
	log(LT.INFO, `${config.name} Logged in!`);
	bot.helpers.editBotStatus({
		activities: [{
			name: 'Booting up . . .',
			type: ActivityTypes.Game,
			createdAt: new Date().getTime(),
		}],
		status: 'online',
	}).catch((e) => log(LT.ERROR, `Failed to update status (booting): ${utils.jsonStringifyBig(e)}`));

	// Interval to rotate the status text every 30 seconds to show off more commands
	if (botStatusIntervalId) clearInterval(botStatusIntervalId);
	botStatusIntervalId = setInterval(async () => {
		log(LT.LOG, 'Changing bot status');
		bot.helpers.editBotStatus({
			activities: [{
				name: getRandomStatus(bot.guilds.size + bot.dispatchedGuildIds.size),
				type: ActivityTypes.Game,
				createdAt: new Date().getTime(),
			}],
			status: 'online',
		}).catch((e) => log(LT.ERROR, `Failed to update status (in interval): ${utils.jsonStringifyBig(e)}`));
	}, 30000);

	// Interval to handle event notifications and cleanup every 30 seconds
	if (notificationIntervalId) clearInterval(notificationIntervalId);
	notificationIntervalId = setInterval(async () => {
		log(LT.LOG, 'Running notification system');
		const now = new Date().getTime();

		// Get all the events
		const eventsToNotify = await dbClient.execute(queries.selectEvents(0, 0), [new Date(now + tenMinutes)]).catch((e) =>
			utils.commonLoggers.dbError('ready.ts@notifyMembers', 'SELECT events from', e)
		);
		const eventsToLock = await dbClient.execute(queries.selectEvents(1, 0), [new Date(now)]).catch((e) => utils.commonLoggers.dbError('ready.ts@notifyAlternates', 'SELECT events from', e));
		const eventsToDelete = await dbClient.execute(queries.selectEvents(1, 1), [new Date(now - tenMinutes)]).catch((e) => utils.commonLoggers.dbError('ready.ts@deleteEvent', 'SELECT events from', e));
		const eventFailuresToHandle = await dbClient.execute(queries.selectFailedEvents, [new Date(now + tenMinutes)]).catch((e) =>
			utils.commonLoggers.dbError('ready.ts@handleFailures', 'SELECT events from', e)
		);

		// Run all the handlers
		eventsToNotify?.rows?.forEach((event) => notifyEventMembers(bot, event as ActiveEvent));
		eventsToLock?.rows?.forEach((event) => lockEvent(bot, event as ActiveEvent));
		eventsToDelete?.rows?.forEach((event) => deleteEvent(bot, event as ActiveEvent));
		eventFailuresToHandle?.rows?.forEach((event) => handleFailures(bot, event as ActiveEvent));
	}, 30000);

	// Interval to handle updating botList statistics
	if (botListPosterIntervalId) clearInterval(botListPosterIntervalId)
	LOCALMODE ? log(LT.INFO, 'updateListStatistics not running') : botListPosterIntervalId = setInterval(() => {
		log(LT.LOG, 'Updating all bot lists statistics');
		updateBotListStatistics(bot.guilds.size + bot.dispatchedGuildIds.size);
	}, 86400000);

	// setTimeout added to make sure the startup message does not error out
	setTimeout(() => {
		LOCALMODE && bot.helpers.editBotMember(config.devServer, { nick: `LOCAL - ${config.name}` });

		bot.helpers.editBotStatus({
			activities: [{
				name: 'Booting Complete',
				type: ActivityTypes.Game,
				createdAt: new Date().getTime(),
			}],
			status: 'online',
		}).catch((e) => log(LT.ERROR, `Failed to update status (boot complete): ${utils.jsonStringifyBig(e)}`));

		bot.helpers.sendMessage(config.logChannel, {
			embeds: [{
				title: `${config.name} is now Online`,
				color: successColor,
				fields: [
					{
						name: 'Version:',
						value: `${config.version}`,
						inline: true,
					},
				],
			}],
		}).catch((e: Error) => utils.commonLoggers.messageSendError('ready.ts@startup', 'Startup', e));
	}, 1000);
};
