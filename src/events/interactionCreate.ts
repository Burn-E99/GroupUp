import { Bot, BotWithCache, Interaction } from '../../deps.ts';
import { commands } from '../commands/_index.ts';

const commandNames: Array<string> = commands.map((command) => command.details.name);

export const interactionCreate = (rawBot: Bot, interaction: Interaction) => {
	const bot = rawBot as BotWithCache;
	if (interaction.data && interaction.id) {
		if (interaction.data.name) {
			if (commandNames.includes(interaction.data.name)) {
				const cmdIdx = commandNames.indexOf(interaction.data.name);
				commands[cmdIdx].execute(bot, interaction);
			}
		}
	}
};
