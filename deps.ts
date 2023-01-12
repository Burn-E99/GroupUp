// All external dependencies are to be loaded here to make updating dependency versions much easier
import { getBotIdFromToken } from 'https://deno.land/x/discordeno@16.0.1/mod.ts';
import config from './config.ts';
import { LOCALMODE } from './flags.ts';
export const botId = getBotIdFromToken(LOCALMODE ? config.localToken : config.token);

export { enableCachePlugin, enableCacheSweepers } from 'https://deno.land/x/discordeno@17.0.1/plugins/cache/mod.ts';
export type { BotWithCache } from 'https://deno.land/x/discordeno@17.0.1/plugins/cache/mod.ts';

export {
	ActivityTypes,
	ApplicationCommandFlags,
	ApplicationCommandTypes,
	createBot,
	editBotMember,
	editBotStatus,
	getBotIdFromToken,
	Intents,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
	startBot,
} from 'https://deno.land/x/discordeno@17.0.1/mod.ts';
export type {
	ActionRow,
	ApplicationCommand,
	ApplicationCommandOption,
	Bot,
	ButtonComponent,
	CreateApplicationCommand,
	CreateMessage,
	Embed,
	EventHandlers,
	Guild,
	Interaction,
	MakeRequired,
	Message,
	PermissionStrings,
} from 'https://deno.land/x/discordeno@17.0.1/mod.ts';

export { Client } from 'https://deno.land/x/mysql@v2.11.0/mod.ts';

export { initLog, log, LogTypes as LT } from 'https://raw.githubusercontent.com/Burn-E99/Log4Deno/V1.1.0/mod.ts';
