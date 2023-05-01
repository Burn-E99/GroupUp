// This file will populate the tables with default values
import { dbClient } from '../src/db.ts';

console.log('Attempting to insert default actions into command_cnt');
const actions = [
	'msg-mention',
	'cmd-audit',
	'cmd-delete',
	'cmd-help',
	'cmd-info',
	'cmd-report',
	'cmd-setup',
	'cmd-gameSel',
	'cmd-join',
	'cmd-leave',
	'cmd-alternate',
	'btn-gameSel',
	'btn-customAct',
	'btn-createEvt',
	'btn-createWLEvt',
	'btn-joinEvent',
	'btn-joinWLEvent',
	'btn-leaveEvent',
	'btn-leaveEventViaDM',
	'btn-altEvent',
	'btn-joinReqApprove',
	'btn-joinReqDeny',
	'btn-joinReqAlt',
	'btn-delEvent',
	'btn-confirmDelEvent',
	'btn-editEvent',
	'btn-eeChangeAct',
	'btn-eeCustomAct',
	'btn-eeChangeTime',
	'btn-eeChangeDesc',
	'btn-eeMakePublic',
	'btn-eeMakeWL',
	'lfg-filled',
];
for (const action of actions) {
	await dbClient.execute('INSERT INTO command_cnt(command) values(?)', [action]).catch((e) => {
		console.log(`Failed to insert into database`, e);
	});
}
console.log('Insertion done');

await dbClient.close();
console.log('Done!');
