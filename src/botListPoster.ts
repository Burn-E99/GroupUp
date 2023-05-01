import { botId, log, LT } from '../deps.ts';
import config from '../config.ts';

// updateListStatistics(bot ID, current guild count) returns nothing, posts to botlists
// Sends the current server count to all bot list sites we are listed on
export const updateBotListStatistics = (serverCount: number): void => {
	config.botLists.forEach(async (botList) => {
		try {
			log(LT.LOG, `Updating statistics for ${JSON.stringify(botList)}`);
			if (botList.enabled) {
				const tempHeaders = new Headers();
				tempHeaders.append(botList.headers[0].header, botList.headers[0].value);
				tempHeaders.append('Content-Type', 'application/json');
				// ?{} is a template used in config, just need to replace it with the real value
				const response = await fetch(botList.apiUrl.replace('?{bot_id}', botId.toString()), {
					'method': 'POST',
					'headers': tempHeaders,
					'body': JSON.stringify(botList.body).replace('"?{server_count}"', serverCount.toString()), // ?{server_count} needs the "" removed from around it aswell to make sure its sent as a number
				});
				log(LT.INFO, `Posted server count to ${botList.name}.  Results: ${JSON.stringify(response)}`);
			}
		} catch (err) {
			log(LT.ERROR, `Failed to update statistics for ${botList.name} | Error: ${err.name} - ${err.message}`)
		}
	});
};
