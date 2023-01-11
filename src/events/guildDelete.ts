import config from '../../config.ts';
import {
	// Discordeno deps
	Bot,
	// Log4Deno deps
	log,
	LT,
	// Discordeno deps
	sendMessage,
} from '../../deps.ts';
import { warnColor } from '../commandUtils.ts';
import { dbClient } from '../db.ts';
import utils from '../utils.ts';

export const guildDelete = async (bot: Bot, guildId: bigint) => {
	log(LT.LOG, `Handling leaving guild ${utils.jsonStringifyBig(guildId)}`);

	try {
		await dbClient.execute('DELETE FROM guild_prefix WHERE guildId = ?', [guildId]);
		await dbClient.execute('DELETE FROM guild_mod_role WHERE guildId = ?', [guildId]);
		await dbClient.execute('DELETE FROM guild_clean_channel WHERE guildId = ?', [guildId]);
	} catch (e) {
		log(LT.WARN, `Failed to remove guild from DB: ${utils.jsonStringifyBig(e)}`);
	}

	sendMessage(bot, config.logChannel, {
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
