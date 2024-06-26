import { dbClient } from './client.ts';
import { DBGuildSettings, LfgChannelSetting } from '../types/commandTypes.ts';

export const queries = {
	callIncCnt: (cmdName: string) => `CALL INC_CNT("${cmdName}");`,
	selectEvents: (notifiedFlag: number, lockedFlag: number) => `SELECT * FROM active_events WHERE notifiedFlag = ${notifiedFlag} AND lockedFlag = ${lockedFlag} AND eventTime < ?`,
	selectFailedEvents: 'SELECT * FROM active_events WHERE (notifiedFlag = -1 OR lockedFlag = -1) AND eventTime < ?',
	insertEvent: 'INSERT INTO active_events(messageId,channelId,guildId,ownerId,eventTime) values(?,?,?,?,?)',
	updateEventTime: 'UPDATE active_events SET eventTime = ? WHERE channelId = ? AND messageId = ?',
	updateEventFlags: (notifiedFlag: number, lockedFlag: number) => `UPDATE active_events SET notifiedFlag = ${notifiedFlag}, lockedFlag = ${lockedFlag} WHERE channelId = ? AND messageId = ?`,
	deleteEvent: 'DELETE FROM active_events WHERE channelId = ? AND messageId = ?',
	insertCustomActivity: 'INSERT INTO custom_activities(guildId,activityTitle,activitySubtitle,maxMembers) values(?,?,?,?)',
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
