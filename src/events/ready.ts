import config from '../../config.ts';
import { LOCALMODE } from '../../flags.ts';
import { ActivityTypes, Bot, BotWithCache, editBotMember, editBotStatus, log, LT } from '../../deps.ts';
import { getRandomStatus, successColor } from '../commandUtils.ts';
import utils from '../utils.ts';

export const ready = (rawBot: Bot) => {
	const bot = rawBot as BotWithCache;
	log(LT.INFO, `${config.name} Logged in!`);
	editBotStatus(bot, {
		activities: [{
			name: 'Booting up . . .',
			type: ActivityTypes.Game,
			createdAt: new Date().getTime(),
		}],
		status: 'online',
	});

	// Interval to rotate the status text every 30 seconds to show off more commands
	setInterval(async () => {
		log(LT.LOG, 'Changing bot status');
		try {
			// Wrapped in try-catch due to hard crash possible
			editBotStatus(bot, {
				activities: [{
					name: getRandomStatus(bot.guilds.size + bot.dispatchedGuildIds.size),
					type: ActivityTypes.Game,
					createdAt: new Date().getTime(),
				}],
				status: 'online',
			});
		} catch (e) {
			log(LT.ERROR, `Failed to update status: ${utils.jsonStringifyBig(e)}`);
		}
	}, 30000);

	// setTimeout added to make sure the startup message does not error out
	setTimeout(() => {
		LOCALMODE && editBotMember(bot, config.devServer, { nick: `LOCAL - ${config.name}` });
		editBotStatus(bot, {
			activities: [{
				name: 'Booting Complete',
				type: ActivityTypes.Game,
				createdAt: new Date().getTime(),
			}],
			status: 'online',
		});
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
