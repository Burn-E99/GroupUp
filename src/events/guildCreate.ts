import config from '../../config.ts';
import { Bot, Guild, log, LT } from '../../deps.ts';
import { infoColor1 } from '../commandUtils.ts';
import utils from '../utils.ts';

export const guildCreate = (bot: Bot, guild: Guild) => {
	log(LT.LOG, `Handling joining guild ${utils.jsonStringifyBig(guild)}`);
	bot.helpers.sendMessage(config.logChannel, {
		embeds: [{
			title: 'Guild Joined!',
			color: infoColor1,
			fields: [
				{
					name: 'Name:',
					value: `${guild.name}`,
					inline: true,
				},
				{
					name: 'Id:',
					value: `${guild.id}`,
					inline: true,
				},
				{
					name: 'Member Count:',
					value: `${guild.memberCount}`,
					inline: true,
				},
			],
		}],
	}).catch((e: Error) => utils.commonLoggers.messageSendError('mod.ts:95', 'Join Guild', e));
};
