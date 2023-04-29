// This file will create all tables for the groupup schema
// DATA WILL BE LOST IF DB ALREADY EXISTS, RUN AT OWN RISK

import config from '../config.ts';
import { dbClient } from '../src/db.ts';

console.log('Attempting to create DB');
await dbClient.execute(`CREATE SCHEMA IF NOT EXISTS ${config.db.name};`);
await dbClient.execute(`USE ${config.db.name}`);
console.log('DB created');

console.log('Attempt to drop all tables');
await dbClient.execute(`DROP PROCEDURE IF EXISTS INC_CNT;`);
await dbClient.execute(`DROP TABLE IF EXISTS command_cnt;`);
await dbClient.execute(`DROP TABLE IF EXISTS guild_settings;`);
await dbClient.execute(`DROP TABLE IF EXISTS active_events;`);
await dbClient.execute(`DROP TABLE IF EXISTS custom_activities;`);
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
		declare oldCnt bigint unsigned;
		set oldCnt = (SELECT count FROM command_cnt WHERE command = cmd);
		UPDATE command_cnt SET count = oldCnt + 1 WHERE command = cmd;
	END
`);
console.log('Stored Procedure created');

console.log('Attempting to create table guild_settings');
await dbClient.execute(`
	CREATE TABLE guild_settings (
		guildId bigint unsigned NOT NULL,
		lfgChannelId bigint unsigned NOT NULL,
		managerRoleId bigint unsigned NOT NULL,
		logChannelId bigint unsigned NOT NULL,
		PRIMARY KEY (guildId, lfgChannelId)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

console.log('Attempting to create table active_events');
await dbClient.execute(`
	CREATE TABLE active_events (
		messageId bigint unsigned NOT NULL,
		channelId bigint unsigned NOT NULL,
		guildId bigint unsigned NOT NULL,
		ownerId bigint unsigned NOT NULL,
		eventTime datetime NOT NULL,
		notifiedFlag tinyint(1) NOT NULL DEFAULT 0,
		lockedFlag tinyint(1) NOT NULL DEFAULT 0,
		PRIMARY KEY (messageId, channelId)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');
/**
 * notifiedFlag
 * 	0 = Not notified
 * 	1 = Notified Successfully
 * 	-1 = Failed to notify
 * lockedFlag
 * 	0 = Not locked
 * 	1 = Locked Successfully
 * 	-1 = Failed to lock
 *
 * If both are -1, the event failed to delete
 */

console.log('Attempting to create table custom_activities');
await dbClient.execute(`
	CREATE TABLE custom_activities (
		id int unsigned NOT NULL AUTO_INCREMENT,
		activityTitle char(35) NOT NULL,
		activitySubtitle char(50) NOT NULL,
		maxMembers tinyint NOT NULL,
		PRIMARY KEY (id),
		UNIQUE KEY custom_activities_id_UNIQUE (id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
console.log('Table created');

await dbClient.close();
console.log('Done!');
