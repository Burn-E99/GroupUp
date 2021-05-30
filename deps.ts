// All external dependancies are to be loaded here to make updating dependancy versions much easier
export {
	startBot, editBotStatus, editBotNickname,
	Intents, DiscordActivityTypes, DiscordButtonStyles, DiscordInteractionTypes,
	sendMessage, sendDirectMessage, sendInteractionResponse, getMessage, deleteMessage,
	hasGuildPermissions,
	cache, botId, structures
} from "https://deno.land/x/discordeno@11.0.0-rc.5/mod.ts";

export type {
	DiscordenoMessage, DiscordenoMember, DiscordenoGuild, CreateMessage, Interaction, ButtonComponent, ActionRow, EmbedField
} from "https://deno.land/x/discordeno@11.0.0-rc.5/mod.ts"; // https://deno.land/x/discordeno@11.0.0-rc.5/mod.ts

export { Client } from "https://deno.land/x/mysql@v2.9.0/mod.ts";

export { LogTypes as LT, initLog, log } from "https://raw.githubusercontent.com/Burn-E99/Log4Deno/V1.1.0/mod.ts";

export { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
