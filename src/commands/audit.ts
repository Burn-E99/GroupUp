import config from '../../config.ts';
import { ApplicationCommandOptionTypes, ApplicationCommandTypes, Bot, DiscordEmbedField, Interaction, InteractionResponseTypes } from '../../deps.ts';
import { infoColor2, isLFGChannel, somethingWentWrong } from '../commandUtils.ts';
import { dbClient, queries } from '../db.ts';
import { CommandDetails } from '../types/commandTypes.ts';
import utils from '../utils.ts';
import { auditSlashName } from './slashCommandNames.ts';

const auditDbName = 'database';
const auditCustomActivities = 'custom-activities';
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
			name: auditCustomActivities,
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

const execute = async (bot: Bot, interaction: Interaction) => {
	if (interaction.member && interaction.guildId && interaction.data?.options?.[0].options) {
		dbClient.execute(queries.callIncCnt('cmd-audit')).catch((e) => utils.commonLoggers.dbError('audit.ts@inc', 'call sproc INC_CNT on', e));
		const auditName = interaction.data.options[0].name;
		switch (auditName) {
			case auditDbName:
				// Get DB statistics
				const auditQuery = await dbClient.query(`SELECT * FROM db_size;`).catch((e) => utils.commonLoggers.dbError('audit.ts@dbSize', 'query', e));

				// Turn all tables into embed fields, currently only properly will handle 25 tables, but we'll fix that when group up gets 26 tables
				const embedFields: Array<DiscordEmbedField> = [];
				auditQuery.forEach((row: any) => {
					embedFields.push({
						name: `${row.table}`,
						value: `**Size:** ${row.size} MB
**Rows:** ${row.rows}`,
						inline: true,
					});
				});
				bot.helpers.sendInteractionResponse(
					interaction.id,
					interaction.token,
					{
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: isLFGChannel(interaction.guildId || 0n, interaction.channelId || 0n),
							embeds: [{
								color: infoColor2,
								title: 'Database Audit',
								description: 'Lists all tables with their current size and row count.',
								timestamp: new Date().getTime(),
								fields: embedFields.slice(0, 25),
							}],
						},
					},
				).catch((e: Error) => utils.commonLoggers.interactionSendError('audit.ts@dbSize', interaction, e));
				break;
			case auditCustomActivities:
			case auditGuildName:
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
