import config from '../../config.ts';
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, BotWithCache, DiscordEmbedField, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor2, isLFGChannel, somethingWentWrong } from '../commandUtils.ts';
import { dbClient } from '../db/client.ts';
import { queries } from '../db/common.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { auditSlashName } from './slashCommandNames.ts';

type DupeAct = {
	upperActTitle?: string;
	upperActSubtitle?: string;
	dupeCount: number;
};

type DBSizeTable = {
	table: string;
	size: number;
	rows: number;
};

const auditDbName = 'database';
const auditCustomActivitiesName = 'custom-activities';
const auditGuildName = 'guilds';

const details: CommandDetails = {
	name: auditSlashName,
	description: `Developer Command for checking in on ${config.name}'s health.`,
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['ADMINISTRATOR'],
	options: [
		{
			name: auditDbName,
			type: ApplicationCommandOptionTypes.SubCommand,
			description: `Developer Command: Checks ${config.name}'s DB size.`,
		},
		{
			name: auditCustomActivitiesName,
			type: ApplicationCommandOptionTypes.SubCommand,
			description: 'Developer Command: Checks for duplicate custom activities.',
		},
		{
			name: auditGuildName,
			type: ApplicationCommandOptionTypes.SubCommand,
			description: `Developer Command: Checks in on channel and member counts of guilds that ${config.name} is in.`,
		},
	],
};

const execute = async (bot: BotWithCache, interaction: Interaction) => {
	if (interaction.member && interaction.guildId && interaction.data?.options?.[0].options) {
		dbClient.execute(queries.callIncCnt('cmd-audit')).catch((e) => utils.commonLoggers.dbError('audit.ts@inc', 'call sproc INC_CNT on', e));
		const auditName = interaction.data.options[0].name;
		switch (auditName) {
			case auditDbName: {
				// Get DB statistics
				const auditQuery: Array<DBSizeTable> = await dbClient.query(`SELECT * FROM db_size;`).catch((e) => utils.commonLoggers.dbError('audit.ts@dbSize', 'query', e));

				// Turn all tables into embed fields, currently only properly will handle 25 tables, but we'll fix that when group up gets 26 tables
				const embedFields: Array<DiscordEmbedField> = [];
				auditQuery.forEach((row) => {
					embedFields.push({
						name: `${row.table}`,
						value: `**Size:** ${row.size} MB
**Rows:** ${row.rows}`,
						inline: true,
					});
				});
				bot.helpers
					.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
							embeds: [
								{
									color: infoColor2,
									title: 'Database Audit',
									description: 'Lists all tables with their current size and row count.',
									timestamp: new Date().getTime(),
									fields: embedFields.slice(0, 25),
								},
							],
						},
					})
					.catch((e: Error) => utils.commonLoggers.interactionSendError('audit.ts@dbSize', interaction, e));
				break;
			}
			case auditCustomActivitiesName: {
				const dupActTitles: Array<DupeAct> = await dbClient.query(
					`SELECT UPPER(activityTitle) as upperActTitle, COUNT(*) as dupeCount FROM custom_activities GROUP BY upperActTitle HAVING dupeCount > 1;`,
				).catch((e) => utils.commonLoggers.dbError('audit.ts@customActTitle', 'query', e));
				const dupActSubTitles: Array<DupeAct> = await dbClient.query(
					`SELECT UPPER(activitySubtitle) as upperActSubtitle, COUNT(*) as dupeCount FROM custom_activities GROUP BY upperActSubtitle HAVING dupeCount > 1;`,
				).catch((e) => utils.commonLoggers.dbError('audit.ts@customActSubTitle', 'query', e));
				const dupActs: Array<DupeAct> = await dbClient
					.query(
						`SELECT UPPER(activityTitle) as upperActTitle, UPPER(activitySubtitle) as upperActSubtitle, COUNT(*) as dupeCount FROM custom_activities GROUP BY upperActTitle, upperActSubtitle HAVING dupeCount > 1;`,
					)
					.catch((e) => utils.commonLoggers.dbError('audit.ts@customAct', 'query', e));

				bot.helpers
					.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
							content: 'Duplicate Custom Activity Titles, Subtitles, and Activities:',
							embeds: [
								{
									color: infoColor2,
									title: 'Duplicate Activity Titles:',
									description: dupActTitles.map((dupAct) => `${dupAct.upperActTitle}: ${dupAct.dupeCount}`).join('\n'),
									timestamp: new Date().getTime(),
								},
								{
									color: infoColor2,
									title: 'Duplicate Activity Subtitles:',
									description: dupActSubTitles.map((dupAct) => `${dupAct.upperActSubtitle}: ${dupAct.dupeCount}`).join('\n'),
									timestamp: new Date().getTime(),
								},
								{
									color: infoColor2,
									title: 'Duplicate Activities (Title/Subtitle):',
									description: dupActs.map((dupAct) => `${dupAct.upperActTitle}/${dupAct.upperActSubtitle}: ${dupAct.dupeCount}`).join('\n'),
									timestamp: new Date().getTime(),
								},
							],
						},
					})
					.catch((e: Error) => utils.commonLoggers.interactionSendError('audit.ts@dbSize', interaction, e));
				break;
			}
			case auditGuildName: {
				let totalCount = 0;
				let auditText = '';

				bot.guilds.forEach((guild) => {
					totalCount += guild.memberCount;
					auditText += `Guild: ${guild.name} (${guild.id})
Owner: ${guild.ownerId}
Tot mem: ${guild.memberCount}
			
`;
				});

				const b = await new Blob([auditText as BlobPart], { 'type': 'text' });
				const tooBig = await new Blob(['tooBig' as BlobPart], { 'type': 'text' });

				bot.helpers
					.sendInteractionResponse(interaction.id, interaction.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
							embeds: [{
								color: infoColor2,
								title: 'Guilds Audit',
								description: `Shows details of the guilds that ${config.name} serves.

Please see attached file for audit details on cached guilds and members.`,
								fields: [
									{
										name: 'Total Guilds:',
										value: `${bot.guilds.size}`,
										inline: true,
									},
									{
										name: 'Uncached Guilds:',
										value: `${bot.dispatchedGuildIds.size}`,
										inline: true,
									},
									{
										name: 'Total Members\n(may be artificially higher if 1 user is in multiple guilds the bot is in):',
										value: `${totalCount}`,
										inline: true,
									},
									{
										name: 'Average members per guild:',
										value: `${(totalCount / bot.guilds.size).toFixed(2)}`,
										inline: true,
									},
								],
								timestamp: new Date().getTime(),
							}],
							file: {
								'blob': b.size > 8388290 ? tooBig : b,
								'name': 'auditDetails.txt',
							},
						},
					})
					.catch((e: Error) => utils.commonLoggers.interactionSendError('audit.ts@guilds', interaction, e));
				break;
			}
			default:
				somethingWentWrong(bot, interaction, `auditNameNotHandled@${auditName}`);
				break;
		}
	} else {
		somethingWentWrong(bot, interaction, 'auditMissingData');
	}
};

export default {
	details,
	execute,
};
