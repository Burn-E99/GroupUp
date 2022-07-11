import {
	// Discordeno deps
	cache,
	deleteMessage,
	getGuild,
	getMessage,
	log,
	// Log4Deno deps
	LT,
	sendDirectMessage,
	sendMessage,
} from '../deps.ts';

import { jsonStringifyBig } from './utils.ts';
import { ActiveLFG, BuildingLFG } from './mod.d.ts';

import config from '../config.ts';

// getRandomStatus() returns status as string
// Gets a new random status for the bot
const getRandomStatus = (cachedGuilds: number): string => {
	let status = '';
	switch (Math.floor((Math.random() * 5) + 1)) {
		case 1:
			status = `${config.prefix}help for commands`;
			break;
		case 2:
			status = `Running V${config.version}`;
			break;
		case 3:
			status = `${config.prefix}info to learn more`;
			break;
		case 4:
			status = 'Mention me to check my prefix!';
			break;
		default:
			status = `Running LFGs in ${cachedGuilds + cache.dispatchedGuildIds.size} servers`;
			break;
	}

	return status;
};

// updateListStatistics(bot ID, current guild count) returns nothing
// Sends the current server count to all bot list sites we are listed on
const updateListStatistics = (botID: BigInt, serverCount: number): void => {
	config.botLists.forEach(async (e) => {
		if (e.enabled) {
			log(LT.LOG, `Updating statistics for ${jsonStringifyBig(e)}`);
			try {
				const tempHeaders = new Headers();
				tempHeaders.append(e.headers[0].header, e.headers[0].value);
				tempHeaders.append('Content-Type', 'application/json');
				// ?{} is a template used in config, just need to replace it with the real value
				const response = await fetch(e.apiUrl.replace('?{bot_id}', botID.toString()), {
					'method': 'POST',
					'headers': tempHeaders,
					'body': jsonStringifyBig(e.body).replace('"?{server_count}"', serverCount.toString()), // ?{server_count} needs the "" removed from around it aswell to make sure its sent as a number
				});
				log(LT.INFO, `Posted server count to ${e.name}.  Results: ${jsonStringifyBig(response)}`);
			} catch (e) {
				log(LT.WARN, `Failed to post statistics to ${e.name} | ${jsonStringifyBig(e)}`);
			}
		}
	});
};

const buildingTimeout = async (activeBuilders: Array<BuildingLFG>): Promise<void> => {
	const currentTime = new Date().getTime();
	for (let i = 0; i < activeBuilders.length; i++) {
		if (activeBuilders[i].lastTouch.getTime() + (activeBuilders[i].maxIdle * 1000) < currentTime) {
			activeBuilders[i].questionMsg.delete().catch((e) => {
				log(LT.WARN, `Failed to clean up active builder | edit | ${activeBuilders[i].userId}-${activeBuilders[i].channelId} | ${jsonStringifyBig(e)}`);
			});
			if (activeBuilders[i].editing) {
				activeBuilders[i].lfgMsg.edit({
					content: '',
				}).catch((e) => {
					log(LT.WARN, `Failed to clean up active builder | edit | ${activeBuilders[i].userId}-${activeBuilders[i].channelId} | ${jsonStringifyBig(e)}`);
				});
			} else {
				activeBuilders[i].lfgMsg.delete().catch((e) => {
					log(LT.WARN, `Failed to clean up active builder | delete | ${activeBuilders[i].userId}-${activeBuilders[i].channelId} | ${jsonStringifyBig(e)}`);
				});
			}
			try {
				const m = await sendMessage(activeBuilders[i].channelId, `<@${activeBuilders[i].userId}>, your LFG ${activeBuilders[i].editing ? 'editing' : 'creation'} has timed out.  Please try again.`);

				m.delete('Channel Cleanup', 30000).catch((e) => {
					log(LT.WARN, `Failed to delete message | ${jsonStringifyBig(e)}`);
				});
			} catch (e) {
				log(LT.WARN, `Failed to clean up active builder | ${activeBuilders[i].userId}-${activeBuilders[i].channelId} | ${jsonStringifyBig(e)}`);
			} finally {
				activeBuilders.splice(i, 1);
				i--;
			}
		}
	}
};

const lfgNotifier = async (activeLFGPosts: Array<ActiveLFG>): Promise<void> => {
	log(LT.INFO, 'Checking for LFG posts to notify/delete/lock');
	const tenMin = 10 * 60 * 1000;
	const now = new Date().getTime();
	for (let i = 0; i < activeLFGPosts.length; i++) {
		// Send notifications
		if (!activeLFGPosts[i].notified && activeLFGPosts[i].lfgTime < (now + tenMin)) {
			log(LT.INFO, `Notifying LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid}`);
			try {
				const message = await getMessage(activeLFGPosts[i].channelId, activeLFGPosts[i].messageId);
				const lfg = message.embeds[0].fields || [];
				const lfgActivity = `${lfg[0].name.substr(0, lfg[0].name.length - 1)} - ${lfg[0].value}`;
				const guildName = message.guild?.name || (await getGuild(message.guildId, { counts: false, addToCache: false })).name;
				const members = lfg[4].value;
				let editMsg = '';
				members.split('\n').forEach(async (m) => {
					if (m !== 'None') {
						const [name, tmpId] = m.split(' - <@');
						const userId = BigInt(tmpId.substr(0, tmpId.length - 1));
						editMsg += `<@${userId}>, `;
						await sendDirectMessage(userId, {
							embeds: [{
								title: `Hello ${name}!  Your event in ${guildName} starts in less than 10 minutes.`,
								fields: [
									lfg[0],
									{
										name: 'Please start grouping up with the other members of this activity:',
										value: members,
									},
								],
							}],
						});
					}
				});
				editMsg += `your ${lfgActivity} starts in less than 10 minutes.`;

				await message.edit({
					content: editMsg,
				});

				activeLFGPosts[i].notified = true;
			} catch (err) {
				log(LT.WARN, `Failed to find LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid} | ${jsonStringifyBig(err)}`);

				activeLFGPosts.splice(i, 1);
				i--;
			}
		} // Lock LFG from editing/Joining/Leaving
		else if (!activeLFGPosts[i].locked && activeLFGPosts[i].lfgTime < now) {
			log(LT.INFO, `Locking LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid}`);
			try {
				const message = await getMessage(activeLFGPosts[i].channelId, activeLFGPosts[i].messageId);

				await message.edit({
					components: [],
				});

				activeLFGPosts[i].locked = true;
			} catch (err) {
				log(LT.WARN, `Failed to find LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid} | ${jsonStringifyBig(err)}`);

				activeLFGPosts.splice(i, 1);
				i--;
			}
		} // Delete old LFG post
		else if (activeLFGPosts[i].lfgTime < (now - tenMin)) {
			log(LT.INFO, `Deleting LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid}`);
			await deleteMessage(activeLFGPosts[i].channelId, activeLFGPosts[i].messageId, 'LFG post expired').catch((e) => {
				log(LT.WARN, `Failed to delete LFG ${activeLFGPosts[i].ownerId}-${activeLFGPosts[i].lfgUid} | ${jsonStringifyBig(e)}`);
			});
			activeLFGPosts.splice(i, 1);
			i--;
		}
	}

	localStorage.setItem('activeLFGPosts', jsonStringifyBig(activeLFGPosts));
};

export default { getRandomStatus, updateListStatistics, buildingTimeout, lfgNotifier };
