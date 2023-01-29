// This file will populate the tables with default values

import { dbClient } from '../src/db.ts';

console.log('Attempting to insert default actions into command_cnt');
const actions = [
	'cmd-delete',
	'cmd-info',
	'cmd-report',
	'cmd-setup',
];
for (const action of actions) {
	await dbClient.execute('INSERT INTO command_cnt(command) values(?)', [action]).catch((e) => {
		console.log(`Failed to insert into database`, e);
	});
}
console.log('Insertion done');

await dbClient.close();
console.log('Done!');
