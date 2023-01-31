import { ApplicationCommandOption, ApplicationCommandTypes, PermissionStrings } from '../../deps.ts';

export type CommandDetails = {
	name: string;
	description: string;
	type: ApplicationCommandTypes;
	options?: ApplicationCommandOption[];
	dmPermission?: boolean;
	defaultMemberPermissions?: PermissionStrings[];
};

export type Command = {
	details: CommandDetails;
	execute: Function;
};

export type Button = {
	customId: string;
	execute: Function;
};

export type LfgChannelSetting = {
	managed: boolean;
	managerRoleId: bigint;
	logChannelId: bigint;
};

export type DBGuildSettings = {
	guildId: bigint;
	lfgChannelId: bigint;
	managerRoleId: bigint;
	logChannelId: bigint;
};
