import {
	EmbedField
} from "../deps.ts";

export type JoinLeaveType = {
	embed: EmbedField[],
	success: boolean,
	full: boolean,
	justFilled: boolean
}

export type UrlIds = {
	guildId: bigint,
	channelId: bigint,
	messageId: bigint
}
