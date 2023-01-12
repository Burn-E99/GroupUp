import { ApplicationCommandOption, ApplicationCommandTypes, PermissionStrings } from '../../deps.ts';

export type CommandDetails = {
	name: string;
	description: string;
	type: ApplicationCommandTypes;
	options?: ApplicationCommandOption[];
	dmPermission?: boolean;
	defaultMemberPermissions?: PermissionStrings[];
};

export type Commands = {
	details: CommandDetails;
	execute: Function;
};
