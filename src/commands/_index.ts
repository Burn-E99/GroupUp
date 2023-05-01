import { Bot, CreateApplicationCommand, log, LT, MakeRequired } from '../../deps.ts';
import { Command } from '../types/commandTypes.ts';
import utils from '../utils.ts';

import audit from './audit.ts';
import info from './info.ts';
import help from './help.ts';
import report from './report.ts';
import setup from './setup.ts';
import deleteCmd from './delete.ts';
import managerJLA from './managerJLA.ts';
import { gameSelectionCommand } from '../buttons/event-creation/step1-gameSelection.ts';

export const commands: Array<Command> = [deleteCmd, info, report, setup, gameSelectionCommand, managerJLA, help, audit];

export const createSlashCommands = async (bot: Bot) => {
	const globalCommands: MakeRequired<CreateApplicationCommand, 'name'>[] = [];
	for (const command of commands) {
		globalCommands.push({
			name: command.details.name,
			description: command.details.description,
			type: command.details.type,
			options: command.details.options ? command.details.options : undefined,
			dmPermission: command.details.dmPermission ? command.details.dmPermission : false,
			defaultMemberPermissions: command.details.defaultMemberPermissions ? command.details.defaultMemberPermissions : undefined,
		});
	}

	await bot.helpers.upsertGlobalApplicationCommands(globalCommands).catch((errMsg) => log(LT.ERROR, `Failed to upsert application commands | ${utils.jsonStringifyBig(errMsg)}`));
};
