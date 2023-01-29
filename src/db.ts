import config from '../config.ts';
import { Client } from '../deps.ts';
import { LOCALMODE } from '../flags.ts';
import { LfgChannelSetting, DBGuildSettings } from './types/commandTypes.ts';

export const dbClient = await new Client().connect({
	hostname: LOCALMODE ? config.db.localhost : config.db.host,
	port: config.db.port,
	db: config.db.name,
	username: config.db.username,
	password: config.db.password,
});

export const queries = {
	callIncCnt: (cmdName: string) => `CALL INC_CNT("${cmdName}");`,
};

export const lfgChannelSettings: Map<string, LfgChannelSetting> = new Map();
const getGuildSettings = await dbClient.query('SELECT * FROM guild_settings');
getGuildSettings.forEach((g: DBGuildSettings) => {
	lfgChannelSettings.set(`${g.guildId}-${g.lfgChannelId}`, {
		managed: g.managerRoleId === 0n && g.logChannelId === 0n,
		managerRoleId: g.managerRoleId,
		logChannelId: g.logChannelId,
	});
});
