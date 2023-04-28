import config from '../config.ts';
import { Client } from '../deps.ts';
import { LOCALMODE } from '../flags.ts';
import { DBGuildSettings, LfgChannelSetting } from './types/commandTypes.ts';

export const dbClient = await new Client().connect({
	hostname: LOCALMODE ? config.db.localhost : config.db.host,
	port: config.db.port,
	db: config.db.name,
	username: config.db.username,
	password: config.db.password,
});

export const queries = {
	callIncCnt: (cmdName: string) => `CALL INC_CNT("${cmdName}");`,
	selectEvents: (notifiedFlag: number, lockedFlag: number) => `SELECT * FROM active_events WHERE notifiedFlag = ${notifiedFlag} AND lockedFlag = ${lockedFlag} AND eventTime < ?`,
	selectFailedEvents: 'SELECT * FROM active_events WHERE (notifiedFlag = -1 OR lockedFlag = -1) AND eventTime < ?',
	insertEvent: 'INSERT INTO active_events(messageId,channelId,guildId,ownerId,eventTime) values(?,?,?,?,?)',
	updateEventTime: 'UPDATE active_events SET eventTime = ? WHERE channelId = ? AND messageId = ?',
	updateEventFlags: (notifiedFlag: number, lockedFlag: number) => `UPDATE active_events SET notifiedFlag = ${notifiedFlag} AND lockedFlag = ${lockedFlag} WHERE channelId = ? AND messageId = ?`,
	deleteEvent: 'DELETE FROM active_events WHERE channelId = ? AND messageId = ?',
};

export const lfgChannelSettings: Map<string, LfgChannelSetting> = new Map();
export const generateGuildSettingKey = (guildId: bigint, channelId: bigint) => `${guildId}-${channelId}`;
const getGuildSettings = await dbClient.query('SELECT * FROM guild_settings');
getGuildSettings.forEach((g: DBGuildSettings) => {
	lfgChannelSettings.set(generateGuildSettingKey(g.guildId, g.lfgChannelId), {
		managed: g.managerRoleId !== 0n && g.logChannelId !== 0n,
		managerRoleId: g.managerRoleId,
		logChannelId: g.logChannelId,
	});
});
