import config from '../../config.ts';
import { Bot, log, LT } from '../../deps.ts';
import { warnColor } from '../commandUtils.ts';
import { dbClient, lfgChannelSettings } from '../db.ts';
import utils from '../utils.ts';

export const guildDelete = async (bot: Bot, guildId: bigint) => {
	log(LT.LOG, `Handling leaving guild ${utils.jsonStringifyBig(guildId)}`);

	// Clean the DB
	try {
		await dbClient.execute('DELETE FROM guild_settings WHERE guildId = ?', [guildId]);
		await dbClient.execute('DELETE FROM active_events WHERE guildId = ?', [guildId]);
	} catch (e) {
		log(LT.WARN, `Failed to remove guild from DB: ${utils.jsonStringifyBig(e)}`);
	}

	// Clean lfgChannelSettings
	lfgChannelSettings.forEach((_val, key) => {
		if (key.startsWith(`${guildId}-`)) {
			lfgChannelSettings.delete(key);
		}
	});

	// Send Log Message
	bot.helpers.sendMessage(config.logChannel, {
		embeds: [{
			title: 'Removed from Guild',
			color: warnColor,
			fields: [
				{
					name: 'Id:',
					value: `${guildId}`,
					inline: true,
				},
			],
		}],
	}).catch((e: Error) => utils.commonLoggers.messageSendError('guildDelete.ts:28', 'Leave Guild', e));
};
