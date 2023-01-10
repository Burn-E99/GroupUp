import { DiscordenoMessage } from '../deps.ts';

export type BuildingLFG = {
	userId: bigint;
	channelId: bigint;
	step: string;
	lfgMsg: DiscordenoMessage;
	questionMsg: DiscordenoMessage;
	lastTouch: Date;
	maxIdle: number;
	editing: boolean;
};

export type ActiveLFG = {
	messageId: bigint;
	channelId: bigint;
	ownerId: bigint;
	lfgUid: string;
	lfgTime: number;
	notified: boolean;
	locked: boolean;
};

export type GuildPrefixes = {
	guildId: bigint;
	prefix: string;
};

export type GuildModRoles = {
	guildId: bigint;
	roleId: bigint;
};

export type GuildCleanChannels = {
	guildId: bigint;
	channelId: bigint;
};
