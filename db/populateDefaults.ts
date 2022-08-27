// This file will populate the tables with default values

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
	db: config.db.name,
	username: config.db.username,
	password: config.db.password,
});

console.log('Attempting to insert default commands into command_cnt');
const commands = ['ping', 'help', 'info', 'version', 'report', 'privacy', 'lfg', 'prefix'];
for (const command of commands) {
	await dbClient.execute('INSERT INTO command_cnt(command) values(?)', [command]).catch((e) => {
		console.log(`Failed to insert into database`, e);
	});
}
console.log('Insertion done');

await dbClient.close();
console.log('Done!');
