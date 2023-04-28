import config from '../../config.ts';
import { LOCALMODE } from '../../flags.ts';
import { ActivityTypes, Bot, BotWithCache, log, LT } from '../../deps.ts';
import { getRandomStatus, successColor } from '../commandUtils.ts';
import { ActiveEvent } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { dbClient, queries } from '../db.ts';

const tenMinutes = 10 * 60 * 1000;

// Storing intervalIds in case bot soft reboots to prevent multiple of these intervals from stacking
let notificationIntervalId: number;
let botStatusIntervalId: number;

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

	// Interval to handle event notifications and cleanup every minute
	if (notificationIntervalId) clearInterval(notificationIntervalId);
	notificationIntervalId = setInterval(() => {
		const now = new Date().getTime();

		// Notify Members of Events
		dbClient.execute(queries.selectEvents(0, 0), [new Date(now + tenMinutes)]).then((events) => events.rows?.forEach((event) => console.log(event as ActiveEvent))).catch((e) =>
			utils.commonLoggers.dbError('ready.ts@notifyMembers', 'SELECT events from', e)
		);

		// // Notify Alternates of Events (if NOT full) and lock the event message
		// dbClient.execute(queries.selectEvents(1, 0), [new Date(now)]).then((events) => console.log(events.rows as ActiveEvent[])).catch((e) =>
		// 	utils.commonLoggers.dbError('ready.ts@notifyAlternates', 'SELECT events from', e)
		// );

		// // Delete the event
		// dbClient.execute(queries.selectEvents(1, 1), [new Date(now - tenMinutes)]).then((events) => console.log(events.rows as ActiveEvent[])).catch((e) =>
		// 	utils.commonLoggers.dbError('ready.ts@deleteEvent', 'SELECT events from', e)
		// );

		// // Handle events that failed at some point
		// dbClient.execute(queries.selectFailedEvents, [new Date(now + tenMinutes)]).then((events) => console.log(events.rows as ActiveEvent[])).catch((e) =>
		// 	utils.commonLoggers.dbError('ready.ts@deleteEvent', 'SELECT events from', e)
		// );
	}, 60000);

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
