import { ApplicationCommandOption, ApplicationCommandTypes, Bot, BotWithCache, Interaction, PermissionStrings } from '../../deps.ts';

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
	execute: ((bot: Bot, interaction: Interaction) => void) | ((bot: BotWithCache, interaction: Interaction) => void);
};

export type Button = {
	customId: string;
	execute: ((bot: Bot, interaction: Interaction) => void) | ((bot: BotWithCache, interaction: Interaction) => void);
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

export type LFGMember = {
	id: bigint;
	name: string;
	joined?: boolean;
};

export type UrlIds = {
	guildId: bigint;
	channelId: bigint;
	messageId: bigint;
};

export type ActiveEvent = {
	messageId: bigint;
	channelId: bigint;
	guildId: bigint;
	ownerId: bigint;
	eventTime: Date;
	notifiedFlag: number;
	lockedFlag: number;
};
