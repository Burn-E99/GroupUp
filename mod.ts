import {
	// Discordeno deps
	startBot, editBotStatus, editBotNickname,
	Intents, DiscordActivityTypes, DiscordButtonStyles, DiscordInteractionTypes,
	sendMessage, sendInteractionResponse, deleteMessage, getMessage,
	hasGuildPermissions,
	cache, botId, structures,
	DiscordenoMessage, DiscordenoGuild, Interaction, ButtonComponent, ActionRow,

	// MySQL Driver deps
	Client,

	// Log4Deno deps
	LT, initLog, log
} from "./deps.ts";

import { BuildingLFG, ActiveLFG, GuildPrefixes, ButtonData } from "./src/mod.d.ts";
import intervals from "./src/intervals.ts";
import { LFGActivities } from "./src/games.ts";
import { JoinLeaveType } from "./src/lfgHandlers.d.ts";
import { handleLFGStep, handleMemberJoin, handleMemberLeave } from "./src/lfgHandlers.ts";
import { constantCmds, editBtns } from "./src/constantCmds.ts";

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
log(LT.INFO, `${config.name} Starting up . . .`)

// Handle idling out the active builders
const activeBuilders: Array<BuildingLFG> = [];
setInterval(() => {
	intervals.buildingTimeout(activeBuilders); 
}, 1000);

const activeLFGPosts: Array<ActiveLFG> = JSON.parse(localStorage.getItem("activeLFGPosts") || "[]", (_key, value) => {
	if (typeof value === "string" && /^\d+n$/.test(value)) {
		return BigInt(value.substr(0, value.length - 1));
	}
	return value;
});
log(LT.INFO, `Loaded ${activeLFGPosts.length} activeLFGPosts`);
setInterval(() => {
	intervals.lfgNotifier(activeLFGPosts);
}, 60000);

const guildPrefixes: Map<bigint, string> = new Map();
const getGuildPrefixes = await dbClient.query("SELECT * FROM guild_prefix");
getGuildPrefixes.forEach((g: GuildPrefixes) => {
	guildPrefixes.set(g.guildId, g.prefix);
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
			setInterval(() => {
				log(LT.LOG, "Changing bot status");
				try {
					// Wrapped in try-catch due to hard crash possible
					editBotStatus({
						activities: [{
							name: intervals.getRandomStatus(),
							type: DiscordActivityTypes.Game,
							createdAt: new Date().getTime()
						}],
						status: "online"
					});
				} catch (e) {
					log(LT.ERROR, `Failed to update status: ${JSON.stringify(e)}`);
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
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(e)}`);
				});
			}, 1000);
		},
		guildCreate: (guild: DiscordenoGuild) => {
			log(LT.LOG, `Handling joining guild ${JSON.stringify(guild)}`);
			sendMessage(config.logChannel, `New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`).catch(e => {
				log(LT.ERROR, `Failed to send message: ${JSON.stringify(e)}`);
			});
		},
		guildDelete: (guild: DiscordenoGuild) => {
			log(LT.LOG, `Handling leaving guild ${JSON.stringify(guild)}`);
			sendMessage(config.logChannel, `I have been removed from: ${guild.name} (id: ${guild.id}).`).catch(e => {
				log(LT.ERROR, `Failed to send message: ${JSON.stringify(e)}`);
			});
		},
		debug: (dmsg, data) => log(LT.LOG, `Debug Message | ${JSON.stringify(dmsg)} | ${JSON.stringify(data)}`, false),
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
						log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
					});

					if (message.content.trim() === `<@!${botId}>`) {
						message.send({
							embed: {
								title: `Hello ${message.member?.username}, and thanks for using Group Up!`,
								fields: [
									{
										name: `My prefix in this guild is: \`${prefix}\``,
										value: "Mention me with a new prefix to change it."
									}
								]
							}
						});
					}
					
					else if (hasGuildPermissions(message.guildId, message.authorId, ["ADMINISTRATOR"])) {
						const newPrefix = message.content.replace(`<@!${botId}>`, "").trim();

						if (newPrefix.length <= 10) {
							let success = true;
							if (guildPrefixes.has(message.guildId)) {
								// Execute the DB update
								await dbClient.execute("UPDATE guild_prefix SET prefix = ? WHERE guildId = ?", [newPrefix, message.guildId]).catch(e => {
									log(LT.ERROR, `Failed to insert into database: ${JSON.stringify(e)}`);
									success = false;
								});
							} else {
								// Execute the DB insertion
								await dbClient.execute("INSERT INTO guild_prefix(guildId,prefix) values(?,?)", [message.guildId, newPrefix]).catch(e => {
									log(LT.ERROR, `Failed to insert into database: ${JSON.stringify(e)}`);
									success = false;
								});
							}

							if (success) {
								guildPrefixes.set(message.guildId, newPrefix);
								message.send({
									embed: {
										fields: [
											{
												name: `My prefix in this guild is now: \`${newPrefix}\``,
												value: "Mention me with a new prefix to change it."
											}
										]
									}
								});
							} else {
								message.send({
									embed: {
										fields: [
											{
												name: "Something went wrong!",
												value: `My prefix is still \`${prefix}\`.  Please try again, and if the problem persists, please report this to the developers using \`${prefix}report\`.`
											}
										]
									}
								});
							}
						} else {
							message.send({
								embed: {
									fields: [
										{
											name: "Prefix too long, please set a prefix less than 10 characters long.",
											value: "Mention me with a new prefix to change it."
										}
									]
								}
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
								embed: {
									fields: memberJoined.embed,
									footer: {
										text: `Created by: ${message.member.username} | ${newLfgUid}`,
									},
									timestamp: newTimestamp.toISOString()
								},
								components: [
									{
										type: 1,
										components: [
											{
												type: 2,
												label: "Join",
												customId: "active@join_group",
												style: DiscordButtonStyles.Success,
												disabled: currentMembers >= maxMembers
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
							});

							activeLFGPosts.push({
								messageId: activeBuilders[activeIdx].lfgMsg.id,
								channelId: activeBuilders[activeIdx].lfgMsg.channelId,
								ownerId: message.authorId,
								lfgUid: newLfgUid,
								lfgTime: newTimestamp.getTime(),
								notified: false,
								locked: false
							});
							localStorage.setItem("activeLFGPosts", JSON.stringify(activeLFGPosts, (_key, value) =>
								typeof value === "bigint" ? value.toString() + "n" : value
							));
						}
						
						await activeBuilders[activeIdx].questionMsg.delete()
						activeBuilders.splice(activeIdx, 1);
					}
					await message.delete();
				}
				return;
			}
			
			log(LT.LOG, `Handling message ${JSON.stringify(message)}`);

			// Split into standard command + args format
			const args = message.content.slice(prefix.length).trim().split(/[ \n]+/g);
			const command = args.shift()?.toLowerCase();

			// All commands below here

			// ping
			// Its a ping test, what else do you want.
			if (command === "ping") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("ping");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
				try {
					const m = await message.send({
						embed: {
							title: "Ping?"
						}
					});
					m.edit({
						embed: {
							title: `Pong! Latency is ${m.timestamp - message.timestamp}ms.`
						}
					});
				} catch (e) {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				}
			}

			// lfg
			// Handles all LFG commands, creating, editing, deleting
			else if (command === "lfg") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("lfg");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				const subcmd = args[0] || "help";
				const lfgUid = (args[1] || "").toUpperCase();

				// Learn how the LFG command works
				if (subcmd === "help" || subcmd === "h" || subcmd === "?") {
					message.send(constantCmds.lfgHelp).catch(e => {
						log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
					});
				}
				
				// Create a new LFG
				else if (subcmd === "create" || subcmd === "c") {
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
						content: "Please select a game from the list below.  If your game is not listed, please type it out:",
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

					message.delete();
				}

				// Delete an existing LFG
				else if (subcmd === "delete" || subcmd === "d") {
					// User provided a Uid, use it
					if (lfgUid) {
						const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId && lfgUid === lfg.lfgUid));

						// Found one, delete
						if (matches.length) {
							await deleteMessage(matches[0].channelId, matches[0].messageId, "User requested LFG to be deleted.");
							const lfgIdx = activeLFGPosts.findIndex(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId && lfgUid === lfg.lfgUid));
							
							activeLFGPosts.splice(lfgIdx, 1);
							
							localStorage.setItem("activeLFGPosts", JSON.stringify(activeLFGPosts, (_key, value) =>
								typeof value === "bigint" ? value.toString() + "n" : value
							));

							const m = await message.send(constantCmds.lfgDelete3);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
						}

						// Did not find one
						else {
							const m = await message.send(constantCmds.lfgDelete1);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
						}
					}

					// User did not provide a Uid, find it automatically
					else {
						const matches = activeLFGPosts.filter(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId));

						// Found one, delete
						if (matches.length === 1) {
							await deleteMessage(matches[0].channelId, matches[0].messageId, "User requested LFG to be deleted.");
							const lfgIdx = activeLFGPosts.findIndex(lfg => (message.authorId === lfg.ownerId && message.channelId === lfg.channelId));
							
							activeLFGPosts.splice(lfgIdx, 1);
							
							localStorage.setItem("activeLFGPosts", JSON.stringify(activeLFGPosts, (_key, value) =>
								typeof value === "bigint" ? value.toString() + "n" : value
							));

							const m = await message.send(constantCmds.lfgDelete3);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
						}

						// Found multiple, notify user
						else if (matches.length) {
							const deleteMsg = constantCmds.lfgDelete2;
							const deepCloningFailedSoThisIsTheSolution = constantCmds.lfgDelete2.embed.fields[0].value;
							matches.forEach(mt => {
								deleteMsg.embed.fields[0].value += `[${mt.lfgUid}](https://discord.com/channels/${message.guildId}/${mt.channelId}/${mt.messageId})\n`
							});

							deleteMsg.embed.fields[0].value += "\nThis message will self descruct in 30 seconds."

							const m = await message.send(deleteMsg);
							constantCmds.lfgDelete2.embed.fields[0].value = deepCloningFailedSoThisIsTheSolution;
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 30000);
						}

						// Found none, notify user you cannot delete other's lfgs
						else {
							const m = await message.send(constantCmds.lfgDelete1);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
						}
					}
				}

				// Edit an existing LFG
				else if (subcmd === "edit" || subcmd === "e") {
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

							message.delete();
						}

						// Did not find one
						else {
							const m = await message.send(constantCmds.lfgEdit1);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
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

							message.delete();
						}

						// Found multiple, notify user
						else if (matches.length) {
							const deleteMsg = constantCmds.lfgEdit2;
							const deepCloningFailedSoThisIsTheSolution = constantCmds.lfgEdit2.embed.fields[0].value;
							matches.forEach(mt => {
								deleteMsg.embed.fields[0].value += `[${mt.lfgUid}](https://discord.com/channels/${message.guildId}/${mt.channelId}/${mt.messageId})\n`
							});

							deleteMsg.embed.fields[0].value += "\nThis message will self descruct in 30 seconds."

							const m = await message.send(deleteMsg);
							constantCmds.lfgEdit2.embed.fields[0].value = deepCloningFailedSoThisIsTheSolution;
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 30000);
						}

						// Found none, notify user you cannot edit other's lfgs
						else {
							const m = await message.send(constantCmds.lfgEdit1);
							setTimeout(() => {
								m.delete();
								message.delete();
							}, 5000);
						}
					}
				}
			}

			// report or r (command that failed)
			// Manually report something that screwed up
			else if (command === "report" || command === "r") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("report");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				sendMessage(config.reportChannel, ("USER REPORT:\n" + args.join(" "))).catch(e => {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				});
				message.send(constantCmds.report).catch(e => {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				});
			}

			// version or v
			// Returns version of the bot
			else if (command === "version" || command === "v") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("version");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				message.send(constantCmds.version).catch(e => {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				});
			}

			// info or i
			// Info command, prints short desc on bot and some links
			else if (command === "info" || command === "i") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("info");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				message.send(constantCmds.info).catch(e => {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				});
			}
			
			// help or h or ?
			// Help command, prints available commands
			else if (command === "help" || command === "h" || command === "?") {
				// Light telemetry to see how many times a command is being run
				dbClient.execute(`CALL INC_CNT("help");`).catch(e => {
					log(LT.ERROR, `Failed to call stored procedure INC_CNT: ${JSON.stringify(e)}`);
				});

				message.send(constantCmds.help).catch(e => {
					log(LT.ERROR, `Failed to send message: ${JSON.stringify(message)} | ${JSON.stringify(e)}`);
				});
			}
		},
		interactionCreate: async (interact: Interaction) => {
			if (interact.type === DiscordInteractionTypes.MessageComponent) {
				if (interact.message && interact.data && (interact.data as ButtonData).customId && interact.member) {
					sendInteractionResponse(BigInt(interact.id), interact.token, {
						type: 6
					});

					const [handler, stepInfo] = (interact.data as ButtonData).customId.split("@");
					const [action, value] = stepInfo.split("#");
					switch (handler) {
						case "building": {
							await activeBuilders.some(async (x, i) => {
								if (x.channelId === BigInt(interact.channelId) && interact.member && x.userId === BigInt(interact.member.user.id)) {
									x.lastTouch = new Date();
									x = await handleLFGStep(x, value);

									if (x.step === "done") {
										const member = await structures.createDiscordenoMember(interact.member, BigInt(interact.guildId));
										const currentLFG = (x.lfgMsg.embeds[0].fields || []);
										const newTimestamp = new Date(parseInt(currentLFG[1].value.split("#")[1]));
										const newLfgUid = ALPHABET[Math.floor(Math.random()*26)] + ALPHABET[Math.floor(Math.random()*26)];

										const tempMembers = currentLFG[4].name.split(":")[1].split("/");
										const currentMembers = parseInt(tempMembers[0]);
										const maxMembers = parseInt(tempMembers[1]);

										const buttonRow: ActionRow = x.lfgMsg.components[0] as ActionRow;

										(buttonRow.components[0] as ButtonComponent).disabled = currentMembers >= maxMembers;
										if (currentMembers > maxMembers) {
											const currentPeople = currentLFG[4].value.split("\n");
											const newAlts = currentPeople.splice(maxMembers - 1);
											currentLFG[4].value = currentPeople.join("\n");
											currentLFG[5].value = `${newAlts.join("\n")}\n${currentLFG[5].value}`;
											currentLFG[4].name = `Members Joined: ${maxMembers}/${maxMembers}`;
										}

										await x.lfgMsg.edit({
											content: "",
											embed: {
												fields: currentLFG,
												footer: {
													text: `Created by: ${member.username} | ${newLfgUid}`,
												},
												timestamp: newTimestamp.toISOString()
											},
											components: [buttonRow]
										});

										const activeIdx = activeLFGPosts.findIndex(lfg => (lfg.channelId === x.channelId && lfg.messageId === x.lfgMsg.id && lfg.ownerId === x.userId));
										activeLFGPosts[activeIdx].lfgTime = newTimestamp.getTime();
										activeLFGPosts[activeIdx].lfgUid = newLfgUid;

										await activeBuilders[i].questionMsg.delete()
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
							const member = await structures.createDiscordenoMember(interact.member, BigInt(interact.guildId));
							const message = await structures.createDiscordenoMessage(interact.message);

							const embeds = message.embeds[0].fields || [];
							let results: JoinLeaveType = {
								embed: [],
								success: false,
								full: true
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

							if (results.success) {
								const buttonRow: ActionRow = message.components[0] as ActionRow;

								(buttonRow.components[0] as ButtonComponent).disabled = results.full;

								await message.edit({
									embed: {
										fields: results.embed,
										footer: message.embeds[0].footer,
										timestamp: message.embeds[0].timestamp
									},
									components: [buttonRow]
								});
							}

							break;
						}
						case "editing": {
							await activeBuilders.some(async (x, i) => {
								if (x.editing && x.channelId === BigInt(interact.channelId) && interact.member && x.userId === BigInt(interact.member.user.id)) {
									x.step = action;
									x.lastTouch = new Date();
									let nextQuestion = "";
									const nextComponents: Array<ActionRow> = [];
									switch (action) {
										case "set_game": {
											nextQuestion = "Please select a game from the list below.  If your game is not listed, please type it out:";

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
	}
});
