import {
	// Discordeno deps
	startBot, editBotStatus, editBotNickname,
	Intents, DiscordActivityTypes, DiscordButtonStyles, DiscordInteractionTypes,
	sendMessage, sendInteractionResponse, deleteMessage, getMessage, sendDirectMessage, getGuild, getUser,
	hasGuildPermissions,
	cache, botId, DebugArg, cacheHandlers,
	DiscordenoMessage, DiscordenoGuild,
	ButtonComponent, ActionRow, ButtonData,
	Embed, DiscordInteractionResponseTypes,

	// MySQL Driver deps
	Client,

	// Log4Deno deps
	LT, initLog, log
} from "./deps.ts";

import { BuildingLFG, ActiveLFG, GuildPrefixes, GuildModRoles, GuildCleanChannels } from "./src/mod.d.ts";
import intervals from "./src/intervals.ts";
import { LFGActivities } from "./src/games.ts";
import { JoinLeaveType } from "./src/lfgHandlers.d.ts";
import { handleLFGStep, handleMemberJoin, handleMemberLeave, urlToIds } from "./src/lfgHandlers.ts";
import { constantCmds, editBtns, lfgStepQuestions } from "./src/constantCmds.ts";
import { jsonParseBig, jsonStringifyBig } from "./src/utils.ts";

import { DEBUG, LOCALMODE } from "./flags.ts";
import config from "./config.ts";

// Initialize DB client
const dbClient = await new Client().connect({
	hostname: LOCALMODE ? config.db.localhost : config.db.host,
	port: config.db.port,
	db: config.db.name,
	username: config.db.username,
	password: config.db.password
});

// Initialize logging client with folder to use for logs, needs --allow-write set on Deno startup
initLog("logs", DEBUG);
log(LT.INFO, `${config.name} Starting up . . .`);

// Handle idling out the active builders
const activeBuilders: Array<BuildingLFG> = [];
setInterval(() => {
	intervals.buildingTimeout(activeBuilders); 
}, 1000);

const activeLFGPosts: Array<ActiveLFG> = jsonParseBig(localStorage.getItem("activeLFGPosts") || "[]");
log(LT.INFO, `Loaded ${activeLFGPosts.length} activeLFGPosts`);
setInterval(() => {
	intervals.lfgNotifier(activeLFGPosts);
}, 60000);

const guildPrefixes: Map<bigint, string> = new Map();
const getGuildPrefixes = await dbClient.query("SELECT * FROM guild_prefix");
getGuildPrefixes.forEach((g: GuildPrefixes) => {
	guildPrefixes.set(g.guildId, g.prefix);
});

const guildModRoles: Map<bigint, bigint> = new Map();
const getGuildModRoles = await dbClient.query("SELECT * FROM guild_mod_role");
getGuildModRoles.forEach((g: GuildModRoles) => {
	guildModRoles.set(g.guildId, g.roleId);
});

const cleanChannels: Map<bigint, Array<bigint>> = new Map();
const getCleanChannels = await dbClient.query("SELECT * FROM guild_clean_channel");
getCleanChannels.forEach((g: GuildCleanChannels) => {
	const tempArr = cleanChannels.get(g.guildId) || [];
	tempArr.push(g.channelId);
	cleanChannels.set(g.guildId, tempArr);
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Start up the Discord Bot
startBot({
	token: LOCALMODE ? config.localtoken : config.token,
	intents: [Intents.GuildMessages, Intents.DirectMessages, Intents.Guilds],
	eventHandlers: {
		ready: () => {
			log(LT.INFO, `${config.name} Logged in!`);
			editBotStatus({
				activities: [{
					name: "Booting up . . .",
					type: DiscordActivityTypes.Game,
					createdAt: new Date().getTime()
				}],
				status: "online"
			});

			// Interval to rotate the status text every 30 seconds to show off more commands
			setInterval(async () => {
				log(LT.LOG, "Changing bot status");
				try {
					const cachedCount = await cacheHandlers.size("guilds");
					// Wrapped in try-catch due to hard crash possible
					editBotStatus({
						activities: [{
							name: intervals.getRandomStatus(cachedCount),
							type: DiscordActivityTypes.Game,
							createdAt: new Date().getTime()
						}],
						status: "online"
					});
				} catch (e) {
					log(LT.ERROR, `Failed to update status: ${jsonStringifyBig(e)}`);
				}
			}, 30000);

			// Interval to update bot list stats every 24 hours
			LOCALMODE ? log(LT.INFO, "updateListStatistics not running") : setInterval(() => {
				log(LT.LOG, "Updating all bot lists statistics");
				intervals.updateListStatistics(botId, cache.guilds.size);
			}, 86400000);

			// setTimeout added to make sure the startup message does not error out
			setTimeout(() => {
				LOCALMODE && editBotNickname(config.devServer, `LOCAL - ${config.name}`);
				LOCALMODE ? log(LT.INFO, "updateListStatistics not running") : intervals.updateListStatistics(botId, cache.guilds.size);
				editBotStatus({
					activities: [{
						name: "Booting Complete",
						type: DiscordActivityTypes.Game,
						createdAt: new Date().getTime()
					}],
					status: "online"
				});
				sendMessage(config.logChannel, `${config.name} has started, running version ${config.version}.`).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(e)}`);
				});
			}, 1000);
		},
		guildCreate: (guild: DiscordenoGuild) => {
			log(LT.LOG, `Handling joining guild ${jsonStringifyBig(guild)}`);
			sendMessage(config.logChannel, `New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`).catch(e => {
				log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(e)}`);
			});
		},
		guildDelete: async (guild: DiscordenoGuild) => {
			log(LT.LOG, `Handling leaving guild ${jsonStringifyBig(guild)}`);
			sendMessage(config.logChannel, `I have been removed from: ${guild.name} (id: ${guild.id}).`).catch(e => {
				log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(e)}`);
			});

			try {
				await dbClient.execute("DELETE FROM guild_prefix WHERE guildId = ?", [guild.id]);
				await dbClient.execute("DELETE FROM guild_mod_role WHERE guildId = ?", [guild.id]);
				await dbClient.execute("DELETE FROM guild_clean_channel WHERE guildId = ?", [guild.id]);
			}
			catch (e) {
				log(LT.WARN, `Failed to remove guild from DB: ${jsonStringifyBig(e)}`);
			}
		},
		debug: (dmsg: string | DebugArg, data?: string) => log(LT.LOG, `Debug Message | ${jsonStringifyBig(dmsg)} | ${jsonStringifyBig(data)}`, false),
		messageCreate: async (message: DiscordenoMessage) => {
			// Ignore all other bots
			if (message.isBot) return;
			
			const prefix = guildPrefixes.get(message.guildId) || config.prefix;

			// Handle messages not starting with the prefix
			if (message.content.indexOf(prefix) !== 0) {
				// Mentions
				if (message.mentionedUserIds[0] === botId && message.content.trim().startsWith(`<@!${botId}>`)) {
					// Light telemetry to see how many times a command is being run
					await dbClient.execute(`CALL INC_CNT("prefix");`).catch(e => {
						log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
					});

					if (message.content.trim() === `<@!${botId}>`) {
						message.send({
							embeds: [{
								title: `Hello ${message.member?.username}, and thanks for using Group Up!`,
								fields: [
									{
										name: `My prefix in this guild is: \`${prefix}\``,
										value: "Mention me with a new prefix to change it."
									}
								]
							}]
						}).catch(e =>{
							log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
						});
					}
					
					else if (await hasGuildPermissions(message.guildId, message.authorId, ["ADMINISTRATOR"])) {
						const newPrefix = message.content.replace(`<@!${botId}>`, "").trim();

						if (newPrefix.length <= 10) {
							let success = true;
							if (guildPrefixes.has(message.guildId)) {
								// Execute the DB update
								await dbClient.execute("UPDATE guild_prefix SET prefix = ? WHERE guildId = ?", [newPrefix, message.guildId]).catch(e => {
									log(LT.ERROR, `Failed to insert into database: ${jsonStringifyBig(e)}`);
									success = false;
								});
							} else {
								// Execute the DB insertion
								await dbClient.execute("INSERT INTO guild_prefix(guildId,prefix) values(?,?)", [message.guildId, newPrefix]).catch(e => {
									log(LT.ERROR, `Failed to insert into database: ${jsonStringifyBig(e)}`);
									success = false;
								});
							}

							if (success) {
								guildPrefixes.set(message.guildId, newPrefix);
								message.send({
									embeds: [{
										fields: [
											{
												name: `My prefix in this guild is now: \`${newPrefix}\``,
												value: "Mention me with a new prefix to change it."
											}
										]
									}]
								}).catch(e =>{
									log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
								});
							} else {
								message.send({
									embeds: [{
										fields: [
											{
												name: "Something went wrong!",
												value: `My prefix is still \`${prefix}\`.  Please try again, and if the problem persists, please report this to the developers using \`${prefix}report\`.`
											}
										]
									}]
								}).catch(e =>{
									log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
								});
							}
						} else {
							message.send({
								embeds: [{
									fields: [
										{
											name: "Prefix too long, please set a prefix less than 10 characters long.",
											value: "Mention me with a new prefix to change it."
										}
									]
								}]
							}).catch(e =>{
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						}
					}
					return;
				}

				// Other
				const activeIdx = activeBuilders.findIndex(x => (message.channelId === x.channelId && message.authorId === x.userId));
				if (activeIdx > -1) {
					activeBuilders[activeIdx].lastTouch = new Date();
					activeBuilders[activeIdx] = await handleLFGStep(activeBuilders[activeIdx], message.content);
					
					if (activeBuilders[activeIdx].step === "done") {
						if (message.member) {
							const memberJoined = handleMemberJoin(activeBuilders[activeIdx].lfgMsg.embeds[0].fields || [], message.member, false);

							const newTimestamp = new Date(parseInt(memberJoined.embed[1].value.split("#")[1]));
							const newLfgUid = ALPHABET[Math.floor(Math.random()*26)] + ALPHABET[Math.floor(Math.random()*26)];

							const tempMembers = memberJoined.embed[4].name.split(":")[1].split("/");
							const currentMembers = parseInt(tempMembers[0]);
							const maxMembers = parseInt(tempMembers[1]);
							
							if (activeBuilders[activeIdx].editing) {
								if (currentMembers > maxMembers) {
									const currentPeople = memberJoined.embed[4].value.split("\n");
									const newAlts = currentPeople.splice(maxMembers);
									memberJoined.embed[4].value = currentPeople.join("\n") || "None";
									memberJoined.embed[5].value = `${newAlts.join("\n")}\n${memberJoined.embed[5].value === "None" ? "" : memberJoined.embed[5].value}`;
									memberJoined.embed[4].name = `Members Joined: ${maxMembers}/${maxMembers}`;
								}
							}

							await activeBuilders[activeIdx].lfgMsg.edit({
								content: "",
								embeds: [{
									fields: memberJoined.embed,
									footer: {
										text: `Created by: ${message.member.username} | ${newLfgUid}`,
									},
									timestamp: newTimestamp.toISOString()
								}],
								components: [
									{
										type: 1,
										components: [
											{
												type: 2,
												label: "Join",
												customId: "active@join_group",
												style: DiscordButtonStyles.Success
											},
											{
												type: 2,
												label: "Leave",
												customId: "active@leave_group",
												style: DiscordButtonStyles.Danger
											},
											{
												type: 2,
												label: "Join as Alternate",
												customId: "active@alternate_group",
												style: DiscordButtonStyles.Primary
											}
										]
									}
								]
							}).catch(e =>{
								log(LT.WARN, `Failed to edit message | ${jsonStringifyBig(e)}`);
							});

							if (activeBuilders[activeIdx]) {
								const activeLFGIdx = activeLFGPosts.findIndex(lfg => (lfg.channelId === activeBuilders[activeIdx].channelId && lfg.messageId === activeBuilders[activeIdx].lfgMsg.id && lfg.ownerId === activeBuilders[activeIdx].userId));
								if (activeLFGIdx >= 0) {
									activeLFGPosts[activeLFGIdx].lfgUid = newLfgUid;
									activeLFGPosts[activeLFGIdx].lfgTime = newTimestamp.getTime();
									activeLFGPosts[activeLFGIdx].notified = false;
									activeLFGPosts[activeLFGIdx].locked = false;
								} else {
									activeLFGPosts.push({
										messageId: activeBuilders[activeIdx].lfgMsg.id,
										channelId: activeBuilders[activeIdx].lfgMsg.channelId,
										ownerId: message.authorId,
										lfgUid: newLfgUid,
										lfgTime: newTimestamp.getTime(),
										notified: false,
										locked: false
									});
								}
								localStorage.setItem("activeLFGPosts", jsonStringifyBig(activeLFGPosts));
							}
						}
						
						await activeBuilders[activeIdx].questionMsg.delete().catch(e =>{
							log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
						});
						activeBuilders.splice(activeIdx, 1);
					}
					await message.delete().catch(e =>{
						log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
					});
					return;
				}

				// Should this get cleaned up?
				const enabledCleanChannels = cleanChannels.get(message.guildId);
				if (enabledCleanChannels && enabledCleanChannels.length && enabledCleanChannels.indexOf(message.channelId) > -1) {
					message.delete("Cleaning Channel").catch(e =>{
						log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
					});
					return;
				}
				return;
			} else {
				// User is sending a command, make sure its a lfg command if its being sent in a clean channel
				const enabledCleanChannels = cleanChannels.get(message.guildId);
				if (enabledCleanChannels && enabledCleanChannels.length && enabledCleanChannels.indexOf(message.channelId) > -1 && message.content.indexOf(`${prefix}lfg`) !== 0) {
					message.delete("Cleaning Channel").catch(e =>{
						log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
					});
					return;
				}
			}
			
			log(LT.LOG, `Handling message ${jsonStringifyBig(message)}`);

			// Split into standard command + args format
			const args = message.content.slice(prefix.length).trim().split(/[ \n]+/g);
			const command = args.shift()?.toLowerCase();

			// All commands below here

			// ping
			// Its a ping test, what else do you want.
			if (command === "ping") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("ping");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
				try {
					const m = await message.send({
						embeds: [{
							title: "Ping?"
						}]
					});
					m.edit({
						embeds: [{
							title: `Pong! Latency is ${m.timestamp - message.timestamp}ms.`
						}]
					});
				} catch (e) {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				}
			}

			// lfg
			// Handles all LFG commands, creating, editing, deleting
			else if (command === "lfg") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("lfg");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				const subcmd = (args[0] || "help").toLowerCase();
				const lfgUid = (args[1] || "").toUpperCase();

				// Learn how the LFG command works
				if (subcmd === "help" || subcmd === "h" || subcmd === "?") {
					message.send(constantCmds.lfgHelp).catch(e => {
						log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
					});
				}
				
				// Create a new LFG
				else if (subcmd === "create" || subcmd === "c") {
					try {
						const lfgMsg = await message.send(`Creating new LFG post for <@${message.authorId}>.  Please reply with the requested information and watch as your LFG post gets created!`);

						const gameButtons: Array<ButtonComponent> = Object.keys(LFGActivities).map(game => {
							return {
								type: 2,
								label: game,
								customId: `building@set_game#${game}`,
								style: DiscordButtonStyles.Primary
							};
						});

						const buttonComps: Array<ActionRow> = [];

						const temp: Array<ActionRow["components"]> = [];

						gameButtons.forEach((btn, idx) => {
							if (!temp[Math.floor(idx/5)]) {
								temp[Math.floor(idx/5)] = [btn];
							} else {
								temp[Math.floor(idx/5)].push(btn);
							}
						});

						temp.forEach(btns => {
							if (btns.length && btns.length <= 5) {
								buttonComps.push({
									type: 1,
									components: btns
								});
							}
						});

						const question = await message.send({
							content: lfgStepQuestions.set_game,
							components: buttonComps
						});

						activeBuilders.push({
							userId: message.authorId,
							channelId: message.channelId,
							step: "set_game",
							lfgMsg: lfgMsg,
							questionMsg: question,
							lastTouch: new Date(),
							maxIdle: 60,
							editing: false
						});

						message.delete().catch(e =>{
							log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
						});
					}
					catch (e) {
						log(LT.WARN, `LFG failed at step | create | ${jsonStringifyBig(e)}`);
					}
				}

				// Delete an existing LFG
				else if (subcmd === "delete" || subcmd === "d") {
					try {
						// User provided a Uid, use it
						if (lfgUid) {
							const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId && lfgUid === lfg.lfgUid));

							// Found one, delete
							if (matches.length) {
								await deleteMessage(matches[0].channelId, matches[0].messageId, "User requested LFG to be deleted.").catch(e =>{
									log(LT.WARN, `Failed to find message to delete | ${jsonStringifyBig(e)}`);
								});
								const lfgIdx = activeLFGPosts.findIndex(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId && lfgUid === lfg.lfgUid));
								
								activeLFGPosts.splice(lfgIdx, 1);
								
								localStorage.setItem("activeLFGPosts", jsonStringifyBig(activeLFGPosts));

								const m = await message.send(constantCmds.lfgDelete3);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Did not find one
							else {
								const m = await message.send(constantCmds.lfgDelete1);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}
						}

						// User did not provide a Uid, find it automatically
						else {
							const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId));

							// Found one, delete
							if (matches.length === 1) {
								await deleteMessage(matches[0].channelId, matches[0].messageId, "User requested LFG to be deleted.").catch(e =>{
									log(LT.WARN, `Failed to find message to delete | ${jsonStringifyBig(e)}`);
								});
								const lfgIdx = activeLFGPosts.findIndex(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId));
								
								activeLFGPosts.splice(lfgIdx, 1);
								
								localStorage.setItem("activeLFGPosts", jsonStringifyBig(activeLFGPosts));

								const m = await message.send(constantCmds.lfgDelete3);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Found multiple, notify user
							else if (matches.length) {
								const deleteMsg = constantCmds.lfgDelete2;
								const deepCloningFailedSoThisIsTheSolution = constantCmds.lfgDelete2.embeds[0].fields[0].value;
								matches.forEach(mt => {
									deleteMsg.embeds[0].fields[0].value += `[${mt.lfgUid}](https://discord.com/channels/${message.guildId}/${mt.channelId}/${mt.messageId})\n`
								});

								deleteMsg.embeds[0].fields[0].value += "\nThis message will self descruct in 30 seconds."

								const m = await message.send(deleteMsg);
								constantCmds.lfgDelete2.embeds[0].fields[0].value = deepCloningFailedSoThisIsTheSolution;

								m.delete("Channel Cleanup", 30000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 30000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Found none, notify user you cannot delete other's lfgs
							else {
								const m = await message.send(constantCmds.lfgDelete1);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}
						}	
					}
					catch (e) {
						log(LT.WARN, `LFG failed at step | delete | ${jsonStringifyBig(e)}`);
					}
				}

				// Edit an existing LFG
				else if (subcmd === "edit" || subcmd === "e") {
					try {
						// User provided a Uid, use it
						if (lfgUid) {
							const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId && lfgUid === lfg.lfgUid));

							// Found one, edit
							if (matches.length) {
								const lfgMessage = await (await getMessage(matches[0].channelId, matches[0].messageId)).edit({
									content: `Editing new LFG post for <@${matches[0].ownerId}>.  Please reply with the requested information and watch as your LFG post gets edited!`
								});
								const question = await message.send({
									content: "Please select an item to edit from the buttons below:",
									components: [{
										type: 1,
										components: editBtns
									}]
								});

								activeBuilders.push({
									userId: matches[0].ownerId,
									channelId: matches[0].channelId,
									step: "edit_btn",
									lfgMsg: lfgMessage,
									questionMsg: question,
									lastTouch: new Date(),
									maxIdle: 60,
									editing: true
								});

								message.delete().catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Did not find one
							else {
								const m = await message.send(constantCmds.lfgEdit1);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}
						}

						// User did not provide a Uid, find it automatically
						else {
							const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId));

							// Found one, edit
							if (matches.length === 1) {
								const lfgMessage = await (await getMessage(matches[0].channelId, matches[0].messageId)).edit({
									content: `Editing new LFG post for <@${matches[0].ownerId}>.  Please reply with the requested information and watch as your LFG post gets edited!`
								});
								const question = await message.send({
									content: "Please select an item to edit from the buttons below:",
									components: [{
										type: 1,
										components: editBtns
									}]
								});

								activeBuilders.push({
									userId: matches[0].ownerId,
									channelId: matches[0].channelId,
									step: "edit_btn",
									lfgMsg: lfgMessage,
									questionMsg: question,
									lastTouch: new Date(),
									maxIdle: 60,
									editing: true
								});

								message.delete().catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Found multiple, notify user
							else if (matches.length) {
								const deleteMsg = constantCmds.lfgEdit2;
								const deepCloningFailedSoThisIsTheSolution = constantCmds.lfgEdit2.embeds[0].fields[0].value;
								matches.forEach(mt => {
									deleteMsg.embeds[0].fields[0].value += `[${mt.lfgUid}](https://discord.com/channels/${message.guildId}/${mt.channelId}/${mt.messageId})\n`
								});

								deleteMsg.embeds[0].fields[0].value += "\nThis message will self descruct in 30 seconds."

								const m = await message.send(deleteMsg);
								constantCmds.lfgEdit2.embeds[0].fields[0].value = deepCloningFailedSoThisIsTheSolution;

								m.delete("Channel Cleanup", 30000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 30000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}

							// Found none, notify user you cannot edit other's lfgs
							else {
								const m = await message.send(constantCmds.lfgEdit1);

								m.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
								message.delete("Channel Cleanup", 5000).catch(e =>{
									log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
								});
							}
						}
					}
					catch (e) {
						log(LT.WARN, `LFG failed at step | edit | ${jsonStringifyBig(e)}`);
					}
				}

				// Join a LFG on behalf of a user
				// gu!lfg join [url] [join/leave/alternate] [member?] 
				else if (subcmd === "join" || subcmd === "leave" || subcmd === "alternate") {
					try {
						const action = subcmd;
						const lfgIds = urlToIds(args[1] || "");
						const memberStr = args[2] || `<@${message.authorId}>`;
						const member = await message.guild?.members.get(BigInt(memberStr.substr(3, memberStr.length - 4)));
						
						const modRole = guildModRoles.get(message.guildId) || 0n;

						// Join yourself (or others if you are a guild mod) to an LFG
						if (lfgIds.guildId === message.guildId && member && (member.id === message.authorId || message.guildMember?.roles.includes(modRole))) {
							const lfgMessage = await getMessage(lfgIds.channelId, lfgIds.messageId);

							const embeds = lfgMessage.embeds[0].fields || [];
							let results: JoinLeaveType = {
								embed: [],
								success: false,
								full: true,
								justFilled: false
							};
							let actionResp: string;
							switch (action) {
								case "join":
									results = handleMemberJoin(embeds, member, false);
									actionResp = "joined";
									break;
								case "leave":
									results = handleMemberLeave(embeds, member);
									actionResp = "left";
									break;
								case "alternate":
									results = handleMemberJoin(embeds, member, true);
									actionResp = "joined as alternate";
									break;
							}

							let resp: string;
							if (results.success && lfgMessage.components) {
								const buttonRow: ActionRow = lfgMessage.components[0] as ActionRow;

								await lfgMessage.edit({
									embeds: [{
										fields: results.embed,
										footer: lfgMessage.embeds[0].footer,
										timestamp: lfgMessage.embeds[0].timestamp
									}],
									components: [buttonRow]
								});

								if (results.justFilled) {
									const thisLFGPost = activeLFGPosts.filter(lfg => (lfgMessage.id === lfg.messageId && lfgMessage.channelId === lfg.channelId))[0];
									const thisLFG = (await getMessage(thisLFGPost.channelId, thisLFGPost.messageId)).embeds[0].fields || [];
									sendDirectMessage(thisLFGPost.ownerId, {
										embeds: [{
											title: `Hello ${(await getUser(thisLFGPost.ownerId)).username}!  Your event in ${lfgMessage.guild?.name || (await getGuild(message.guildId, {counts:false, addToCache: false})).name} has filled up!`,
											fields: [
												thisLFG[0],
												{
													name: "Your members are:",
													value: thisLFG[4].value
												}
											]
										}]
									});
								}

								resp = `Successfully ${actionResp} LFG.`;
							} else {
								resp = `Failed to ${action} LFG.`
							}

							const m = await message.send({
								embeds: [{
									title: resp
								}]
							});

							m.delete("Channel Cleanup", 5000).catch(e =>{
								log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
							});
							message.delete("Channel Cleanup", 5000).catch(e =>{
								log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
							});
						}
					}
					catch (e) {
						log(LT.WARN, `Member Join/Leave/Alt command failed: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);

						const m = await message.send({
							embeds: [{
								title: "Failed to find LFG."
							}]
						});

						m.delete("Channel Cleanup", ).catch(e => {
							log(LT.WARN, `Failed to clean up joiner | joining on behalf | ${jsonStringifyBig(e)}`);
						});
						message.delete("Channel Cleanup", 5000).catch(e => {
							log(LT.WARN, `Failed to clean up joiner | joining on behalf | ${jsonStringifyBig(e)}`);
						});
					}
				}

				// Sets the mod role
				else if (subcmd === "set_mod_role" && (await hasGuildPermissions(message.guildId, message.authorId, ["ADMINISTRATOR"]))) {
					const mentionedRole = args[1] || "";
					const roleId = BigInt(mentionedRole.substr(3, mentionedRole.length - 4));
					if (message.guild?.roles.has(roleId)) {
						let success = true;
						if (guildModRoles.has(message.guildId)) {
							// Execute the DB update
							await dbClient.execute("UPDATE guild_mod_role SET roleId = ? WHERE guildId = ?", [roleId, message.guildId]).catch(e => {
								log(LT.ERROR, `Failed to insert into database: ${jsonStringifyBig(e)}`);
								success = false;
							});
						} else {
							// Execute the DB insertion
							await dbClient.execute("INSERT INTO guild_mod_role(guildId,roleId) values(?,?)", [message.guildId, roleId]).catch(e => {
								log(LT.ERROR, `Failed to insert into database: ${jsonStringifyBig(e)}`);
								success = false;
							});
						}

						if (success) {
							guildModRoles.set(message.guildId, roleId);
							message.send({
								embeds: [{
									fields: [
										{
											name: "LFG Mod Role set successfully",
											value: `LFG Mod Role set to ${args[1]}.`
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						} else {
							message.send({
								embeds: [{
									fields: [
										{
											name: "Something went wrong!",
											value: "LFG Mod Role has been left unchanged."
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						}
					} else {
						if (guildModRoles.has(message.guildId)) {
							message.send({
								embeds: [{
									fields: [
										{
											name: "LFG Mod Role is currently set to:",
											value: `<@&${guildModRoles.get(message.guildId)}>`
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						} else {
							message.send({
								embeds: [{
									fields: [
										{
											name: "There is no LFG Mod Role set for this guild.",
											value: `To set one, run this command again with the role mentioned.\n\nExample: \`${prefix}lfg set_mod_role @newModRole\``
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						}
					}
				}

				// Sets the channel cleaning up for LFG channels to keep LFG events visible and prevent conversations
				else if (subcmd === "set_clean_channel" && (await hasGuildPermissions(message.guildId, message.authorId, ["ADMINISTRATOR"]))) {
					const cleanSetting = (args[1] || "list").toLowerCase();
					let success = true;
					if (cleanSetting === "on") {
						// Execute the DB insertion
						await dbClient.execute("INSERT INTO guild_clean_channel(guildId,channelId) values(?,?)", [message.guildId, message.channelId]).catch(e => {
							log(LT.ERROR, `Failed to insert into database: ${jsonStringifyBig(e)}`);
							success = false;
						});

						if (success) {
							const tempArr = cleanChannels.get(message.guildId) || [];
							tempArr.push(message.channelId);
							cleanChannels.set(message.guildId, tempArr);

							const m = await message.send({
								embeds: [{
									fields: [
										{
											name: "Channel Cleaning turned ON.",
											value: "This message will self destruct in 5 seconds."
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});


							m && m.delete("Channel Cleanup", 5000).catch(e => {
								log(LT.WARN, `Failed to clean up | set_clean_channel | ${jsonStringifyBig(e)}`);
							});
							message.delete("Channel Cleanup", 5000).catch(e => {
								log(LT.WARN, `Failed to clean up | set_clean_channel | ${jsonStringifyBig(e)}`);
							});
						} else {
							message.send({
								embeds: [{
									fields: [
										{
											name: "Something went wrong!",
											value: "Channel Clean status left off."
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						}
					} else if (cleanSetting === "off") {
						// turns clean off for channel
						// Execute the DB insertion
						await dbClient.execute("DELETE FROM guild_clean_channel WHERE guildId = ? AND channelId = ?", [message.guildId, message.channelId]).catch(e => {
							log(LT.ERROR, `Failed to delete from database: ${jsonStringifyBig(e)}`);
							success = false;
						});

						if (success) {
							let tempArr = cleanChannels.get(message.guildId) || [];
							tempArr = tempArr.filter(channelId => channelId !== message.channelId);
							cleanChannels.set(message.guildId, tempArr);

							const m = await message.send({
								embeds: [{
									fields: [
										{
											name: "Channel Cleaning turned OFF.",
											value: "This message will self destruct in 5 seconds."
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});

							m && m.delete("Channel Cleanup", 5000).catch(e => {
								log(LT.WARN, `Failed to clean up | set_clean_channel | ${jsonStringifyBig(e)}`);
							});
							message.delete("Channel Cleanup", 5000).catch(e => {
								log(LT.WARN, `Failed to clean up | set_clean_channel | ${jsonStringifyBig(e)}`);
							});
						} else {
							message.send({
								embeds: [{
									fields: [
										{
											name: "Something went wrong!",
											value: "Channel Clean status left on."
										}
									]
								}]
							}).catch(e => {
								log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
							});
						}
					} else if (cleanSetting === "list") {
						// send list of channels with clean on
						let cleanChannelStr = "";

						for (const channelId of cleanChannels.get(message.guildId) || []) {
							cleanChannelStr += `<#${channelId}>\n`;
						}
						cleanChannelStr = cleanChannelStr.substr(0, cleanChannelStr.length - 1);

						const tmpEmbed: Embed = {};

						if (cleanChannelStr) {
							tmpEmbed.fields = [
								{
									name: "Clean Channels enabled for this guild:",
									value: cleanChannelStr
								}
							]
						} else {
							tmpEmbed.title = "No Clean Channels are enabled for this guild."
						}

						await message.send({
							embeds: [tmpEmbed]
						}).catch(e => {
							log(LT.WARN, `Failed to send message | ${jsonStringifyBig(e)}`);
						});
					}
				}
			}

			// report or r (command that failed)
			// Manually report something that screwed up
			else if (command === "report" || command === "r") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("report");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				sendMessage(config.reportChannel, ("USER REPORT:\n" + args.join(" "))).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				});
				message.send(constantCmds.report).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				});
			}

			// version or v
			// Returns version of the bot
			else if (command === "version" || command === "v") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("version");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				message.send(constantCmds.version).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				});
			}

			// info or i
			// Info command, prints short desc on bot and some links
			else if (command === "info" || command === "i") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("info");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				message.send(constantCmds.info).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				});
			}
			
			// help or h or ?
			// Help command, prints available commands
			else if (command === "help" || command === "h" || command === "?") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("help");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${jsonStringifyBig(e)}`);
				});

				message.send(constantCmds.help).catch(e => {
					log(LT.ERROR, `Failed to send message: ${jsonStringifyBig(message)} | ${jsonStringifyBig(e)}`);
				});
			}
		},
		interactionCreate: async (interact, member) => {
			try {
				if (interact.type === DiscordInteractionTypes.MessageComponent) {
					if (interact.message && interact.data && (interact.data as ButtonData).customId && member) {
						log(LT.INFO, `Handling Button ${(interact.data as ButtonData).customId}`);
						log(LT.LOG, `Button Data | ${jsonStringifyBig(interact)}`);

						sendInteractionResponse(BigInt(interact.id), interact.token, {
							type: DiscordInteractionResponseTypes.DeferredUpdateMessage
						});

						const [handler, stepInfo] = (interact.data as ButtonData).customId.split("@");
						const [action, value] = stepInfo.split("#");
						switch (handler) {
							case "building": {
								await activeBuilders.some(async (x, i) => {
									if (x.channelId === BigInt(interact.channelId || "0") && member && x.userId === BigInt(member.id)) {
										x.lastTouch = new Date();
										x = await handleLFGStep(x, value);

										if (x.step === "done" && x.lfgMsg.components) {
											const currentLFG = (x.lfgMsg.embeds[0].fields || []);
											const newTimestamp = new Date(parseInt(currentLFG[1].value.split("#")[1]));
											const newLfgUid = ALPHABET[Math.floor(Math.random()*26)] + ALPHABET[Math.floor(Math.random()*26)];

											const tempMembers = currentLFG[4].name.split(":")[1].split("/");
											const currentMembers = parseInt(tempMembers[0]);
											const maxMembers = parseInt(tempMembers[1]);

											const buttonRow: ActionRow = x.lfgMsg.components[0] as ActionRow;

											if (currentMembers > maxMembers) {
												const currentPeople = currentLFG[4].value.split("\n");
												const newAlts = currentPeople.splice(maxMembers - 1);
												currentLFG[4].value = currentPeople.join("\n");
												currentLFG[5].value = `${newAlts.join("\n")}\n${currentLFG[5].value}`;
												currentLFG[4].name = `Members Joined: ${maxMembers}/${maxMembers}`;
											}

											await x.lfgMsg.edit({
												content: "",
												embeds: [{
													fields: currentLFG,
													footer: {
														text: `Created by: ${member.username} | ${newLfgUid}`,
													},
													timestamp: newTimestamp.toISOString()
												}],
												components: [buttonRow]
											});

											const activeIdx = activeLFGPosts.findIndex(lfg => (lfg.channelId === x.channelId && lfg.messageId === x.lfgMsg.id && lfg.ownerId === x.userId));
											activeLFGPosts[activeIdx].lfgTime = newTimestamp.getTime();
											activeLFGPosts[activeIdx].lfgUid = newLfgUid;
											localStorage.setItem("activeLFGPosts", jsonStringifyBig(activeLFGPosts));

											await activeBuilders[i].questionMsg.delete().catch(e =>{
												log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
											});
											activeBuilders.splice(i, 1);
										} else {
											activeBuilders[i] = x;
										}

										return true;
									}
								});
								break;
							}
							case "active": {
								const message = await getMessage(BigInt(interact.channelId || "0"), BigInt(interact.message.id));

								const embeds = message.embeds[0].fields || [];
								let results: JoinLeaveType = {
									embed: [],
									success: false,
									full: true,
									justFilled: false
								};
								switch (action) {
									case "join_group":
										results = handleMemberJoin(embeds, member, false);
										break;
									case "leave_group":
										results = handleMemberLeave(embeds, member);
										break;
									case "alternate_group":
										results = handleMemberJoin(embeds, member, true);
										break;
								}

								if (results.success && message.components) {
									await message.edit({
										embeds: [{
											fields: results.embed,
											footer: message.embeds[0].footer,
											timestamp: message.embeds[0].timestamp
										}],
									});

									if (results.justFilled) {
										const thisLFGPost = activeLFGPosts.filter(lfg => (message.id === lfg.messageId && message.channelId === lfg.channelId))[0];
										const thisLFG = (await getMessage(thisLFGPost.channelId, thisLFGPost.messageId)).embeds[0].fields || [];
										sendDirectMessage(thisLFGPost.ownerId, {
											embeds: [{
												title: `Hello ${(await getUser(thisLFGPost.ownerId)).username}!  Your event in ${message.guild?.name || (await getGuild(message.guildId, {counts:false, addToCache: false})).name} has filled up!`,
												fields: [
													thisLFG[0],
													{
														name: "Your members are:",
														value: thisLFG[4].value
													}
												]
											}]
										});
									}
								}

								break;
							}
							case "editing": {
								await activeBuilders.some(async (x, i) => {
									if (x.editing && x.channelId === BigInt(interact.channelId || "0") && member && x.userId === BigInt(member.id)) {
										x.step = action;
										x.lastTouch = new Date();
										let nextQuestion = "";
										const nextComponents: Array<ActionRow> = [];
										switch (action) {
											case "set_game": {
												nextQuestion = lfgStepQuestions.set_game;

												const gameButtons: Array<ButtonComponent> = Object.keys(LFGActivities).map(game => {
													return {
														type: 2,
														label: game,
														customId: `building@set_game#${game}`,
														style: DiscordButtonStyles.Primary
													};
												});

												const temp: Array<ActionRow["components"]> = [];

												gameButtons.forEach((btn, idx) => {
													if (!temp[Math.floor(idx/5)]) {
														temp[Math.floor(idx/5)] = [btn];
													} else {
														temp[Math.floor(idx/5)].push(btn);
													}
												});

												temp.forEach(btns => {
													if (btns.length && btns.length <= 5) {
														nextComponents.push({
															type: 1,
															components: btns
														});
													}
												});
												break;
											}
											case "set_time": {
												nextQuestion = "Please enter the time of the activity:";
												break;
											}
											case "set_desc": {
												nextQuestion = "Please enter a description for the activity.  Enter `none` to skip:";
												break;
											}
											default:
												break;
										}

										x.questionMsg = await x.questionMsg.edit({
											content: nextQuestion,
											components: nextComponents
										});

										activeBuilders[i] = x;

										return true;
									}
								});
								break;
							}
							default:
								break;
						}
					}
				}
			}
			catch(e) {
				log(LT.ERROR, `Interaction failed: ${jsonStringifyBig(interact)} | ${jsonStringifyBig(member)} | ${jsonStringifyBig(e)}`);
			}
		}
	}
});
