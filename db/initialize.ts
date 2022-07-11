// This file will create all tables for the artificer schema
// DATA WILL BE LOST IF DB ALREADY EXISTS, RUN AT OWN RISK

import {
	// MySQL deps
	Client,
} from '../deps.ts';

import { LOCALMODE } from '../flags.ts';
import config from '../config.ts';

// Log into the MySQL DB
const dbClient = await new Client().connect({
	hostname: LOCALMODE ? config.db.localhost : config.db.host,
	port: config.db.port,
	username: config.db.username,
	password: config.db.password,
});

console.log('Attempting to create DB');
await dbClient.execute(`CREATE SCHEMA IF NOT EXISTS ${config.db.name};`);
await dbClient.execute(`USE ${config.db.name}`);
console.log('DB created');

console.log('Attempt to drop all tables');
await dbClient.execute(`DROP PROCEDURE IF EXISTS INC_CNT;`);
await dbClient.execute(`DROP TABLE IF EXISTS command_cnt;`);
await dbClient.execute(`DROP TABLE IF EXISTS guild_prefix;`);
await dbClient.execute(`DROP TABLE IF EXISTS guild_mod_role;`);
await dbClient.execute(`DROP TABLE IF EXISTS guild_clean_channel;`);
console.log('Tables dropped');

console.log('Attempting to create table command_cnt');
await dbClient.execute(`
	CREATE TABLE command_cnt (
		command char(20) NOT NULL,
		count bigint unsigned NOT NULL DEFAULT 0,
		PRIMARY KEY (command),
		UNIQUE KEY command_cnt_command_UNIQUE (command)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

console.log('Attempt creating increment Stored Procedure');
await dbClient.execute(`
	CREATE PROCEDURE INC_CNT(
		IN cmd CHAR(20)
	)
	BEGIN
		declare oldcnt bigint unsigned;
		set oldcnt = (SELECT count FROM command_cnt WHERE command = cmd);
		UPDATE command_cnt SET count = oldcnt + 1 WHERE command = cmd;
	END
`);
console.log('Stored Procedure created');

console.log('Attempting to create table guild_prefix');
await dbClient.execute(`
	CREATE TABLE guild_prefix (
		guildId bigint unsigned NOT NULL,
		prefix char(10) NOT NULL,
		PRIMARY KEY (guildid),
		UNIQUE KEY guild_prefix_guildid_UNIQUE (guildid)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

console.log('Attempting to create table guild_mod_role');
await dbClient.execute(`
	CREATE TABLE guild_mod_role (
		guildId bigint unsigned NOT NULL,
		roleId bigint unsigned NOT NULL,
		PRIMARY KEY (guildid),
		UNIQUE KEY guild_mod_role_guildid_UNIQUE (guildid)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

console.log('Attempting to create table guild_clean_channel');
await dbClient.execute(`
	CREATE TABLE guild_clean_channel (
		guildId bigint unsigned NOT NULL,
		channelId bigint unsigned NOT NULL,
		PRIMARY KEY (guildid, channelId)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

await dbClient.close();
console.log('Done!');
