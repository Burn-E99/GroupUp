import { ActionRow, DiscordButtonStyles } from '../deps.ts';

import config from '../config.ts';

export const constantCmds = {
	help: {
		embeds: [{
			title: `${config.name} Help`,
			fields: [
				{
					name: 'All commands must have the bot\'s prefix before them.',
					value: `Default is \`${config.prefix}\`, send <@847256159123013722> to change it.`,
				},
				{
					name: 'LFG Commands',
					value: `
					\`lfg help\` - More detailed help for the LFG commands
					\`lfg create\` - Create a new LFG post
					\`lfg edit\` - Edit an existing LFG post
					\`lfg delete\` - Delete an existing LFG post
					`,
				},
				{
					name: 'Utility Commands',
					value: `
					\`info\` - Information about the bot
					\`ping\` - Pings the bot to check its connection
					\`report [TEXT]\` - Report an issue to the developer
					\`version\` - Prints the bot's current version 
					`,
				},
			],
		}],
	},
	lfgHelp: {
		embeds: [{
			title: `${config.name} LFG Help`,
			fields: [
				{
					name: 'All commands must have the bot\'s prefix before them.',
					value: `Default is \`${config.prefix}\`, send <@847256159123013722> to change it.`,
				},
				{
					name: 'lfg create',
					value: `
					\`lfg create\`, alternatively \`lfg c\`, will walk you through creating a new LFG post.  Simply follow the prompts and the bot will walk you through building a new LFG.

					Make sure you run this command in the channel you wish the LFG post to be created in.
					`,
					inline: true,
				},
				{
					name: 'lfg edit',
					value: `
					\`lfg edit [id?]\`, alternatively \`lfg e [id?]\`, will walk you through editing an existing LFG.  Like \`lfg create\`, the bot will walk you through editing it.

					Simply run \`lfg edit\` in the channel where the LFG post lives.
					If you only have one LFG in this channel, the editing process will begin.
					If you have more than one LFG in this channel, the bot will ask you to specify the LFG post using a two character id.
					`,
					inline: true,
				},
				{
					name: 'lfg delete',
					value: `
					\`lfg delete [id?]\`, alternatively \`lfg d [id?]\`, will delete an existing LFG.  You only can delete LFG posts that you own.

					Simply run \`lfg delete\` in the channel where the LFG post lives.
					If you only have one LFG in this channel, the LFG will be deleted.
					If you have more than one LFG in this channel, the bot will ask you to specify the LFG post using a two character id.
					`,
					inline: true,
				},
			],
		}],
	},
	info: {
		embeds: [{
			fields: [
				{
					name: 'Group Up, the LFG bot',
					value: `Group Up is developed by Ean AKA Burn_E99.
					Want to check out my source code?  Check it out [here](https://github.com/Burn-E99/GroupUp).
					Need help with this bot?  Join my support server [here](https://discord.gg/peHASXMZYv).`,
				},
			],
		}],
	},
	version: {
		embeds: [{
			title: `My current version is ${config.version}`,
		}],
	},
	report: {
		embeds: [{
			fields: [
				{
					name: 'Failed command has been reported to my developer.',
					value: 'For more in depth support, and information about planned maintenance, please join the support server [here](https://discord.gg/peHASXMZYv).',
				},
			],
		}],
	},
	lfgDelete1: {
		embeds: [{
			fields: [
				{
					name: 'Could not find any LFGs to delete.',
					value: 'Make sure you are the owner of the LFG and are running this command in the same channel as the LFG',
				},
			],
		}],
	},
	lfgDelete2: {
		embeds: [{
			fields: [
				{
					name: `Multiple LFGs found, please run this command again with the two character ID of the LFG you wish to delete.\n\nExample: \`${config.prefix}lfg delete XX\``,
					value: 'Click on the two character IDs below to view the LFG:\n',
				},
			],
		}],
	},
	lfgDelete3: {
		embeds: [{
			title: 'LFG deleted.',
		}],
	},
	lfgEdit1: {
		embeds: [{
			fields: [
				{
					name: 'Could not find any LFGs to edit.',
					value: 'Make sure you are the owner of the LFG and are running this command in the same channel as the LFG',
				},
			],
		}],
	},
	lfgEdit2: {
		embeds: [{
			fields: [
				{
					name: `Multiple LFGs found, please run this command again with the two character ID of the LFG you wish to edit.\n\nExample: \`${config.prefix}lfg edit XX\``,
					value: 'Click on the two character IDs below to view the LFG:\n',
				},
			],
		}],
	},
	announcement: {
		content: 'Hi!  You\'re receiving this message as you have me in one of your servers.  This is a very important announcement regarding how you and your community uses this bot in your guild.  Please read the following details carefully.\n\nThis announcement feature is reserved for important breaking changes only.  Group Up will be reaching version 1.0 with this major update and will not have any more breaking changes for a significant amount of time.',
		embeds: [{
			title: 'Version 1.0.0 is coming!',
			description: 'Group Up is coming up on a major milestone, giving your community an even better and more user friendly experience.',
			fields: [
				{
					name: 'When is this update coming out?',
					value: 'This update will be pushed out ${discordRelativeTimestamp}, on ${discordTimestamp}.  Group Up will be brought offline one hour before the update goes out to handle a small migration and deploying the major update.',
					inline: true,
				},
				{
					name: 'What is changing?',
					value: 'Group Up is moving to a fully Button Interaction and Slash Command based system.  This means less commands to memorize and gives Group Up users more friendly methods to interact with, such as Forms, and ephemeral messages.',
					inline: true,
				},
				{
					name: 'What do you need to do?',
					value: `Once the update is live, there are a couple things you will need to do:

1. The bot will now require the 'Manage Channels' permission.  Simply edit the role named 'Group Up' in your server to add this permission.  This increase in permission is needed for the initial setup that you will be running next.
2. Go to or create the channel you want Group Up to use for event scheduling.  Group Up will be taking full control of this channel, so please make sure you are OK with that before continuing.
3. Once in the desired channel, run \`/commandName\` and follow on screen prompts.  This will discover any pre-existing events, update them to the new design, and reconfigure the channel to work with the new system.

Note: If there are any pre-existing events, they will end up above the new instructions message Group Up sends.  This is expected and unavoidable.`,
				},
				{
					name: 'What if I don\'t want to update?',
					value: 'As hosting costs money and I am running this bot for free, only the new system will be available from the official Group Up Discord bot.\n\nIf you really want to keep the old text based system, you may do so by hosting the bot yourself.  This is **not recommended and not supported**, but as this project is open source, you may check out [my GitHub](https://github.com/Burn-E99/GroupUp) for details on how to host it privately.'
				},
				{
					name: 'Have more questions?',
					value: 'I have tried to anticipate every question possible, but if I have missed your question, please join [my support server](https://discord.gg/peHASXMZYv).',
				},
				{
					name: 'Final Words',
					value: 'As I want to avoid these unsolicited DMs in the future, please join [my support server](https://discord.gg/peHASXMZYv).  All future announcements will be sent via this server.\n\nThank you for using Group Up, and I hope you enjoy this major update.\n\n~Ean AKA Burn_E99',
				},
			],
		}],
	},
};

export const editBtns: ActionRow['components'] = [
	{
		type: 2,
		label: 'Change Game/Activity',
		customId: `editing@set_game`,
		style: DiscordButtonStyles.Primary,
	},
	{
		type: 2,
		label: 'Change Time',
		customId: `editing@set_time`,
		style: DiscordButtonStyles.Primary,
	},
	{
		type: 2,
		label: 'Change Description',
		customId: `editing@set_desc`,
		style: DiscordButtonStyles.Primary,
	},
];

export const lfgStepQuestions = {
	'set_game': 'Please select a game from the list below.  If your game is not listed, please type it out:',
	'set_activity_with_button':
		'Please select an Activity from the list below.  Depending on the game selected, these may be categories you can use to drill down to a specific activity.\n\nIf your activity is not listed, please type it out:',
	'set_activity_with_text': 'Please type the activity name out:',
	'set_activity_from_category': 'Please select an Activity from the list below.\n\nIf your activity is not listed, please type it out:',
	'set_player_cnt': 'Please enter the max number of members for this activity:',
	'set_time': 'Please enter the time of the activity:\nRecommended format: `h:mm am/pm tz month/day`',
	'set_desc': 'Please enter a description for the activity.  Enter `none` to skip:',
	'set_done': 'Finalizing, please wait. . .',
};
