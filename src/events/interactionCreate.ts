import { Bot, BotWithCache, Interaction } from '../../deps.ts';
import { buttons } from '../buttons/_index.ts';
import { commands } from '../commands/_index.ts';

const commandNames: Array<string> = commands.map((command) => command.details.name);
const buttonNames: Array<string> = buttons.map((button) => button.customId);

export const interactionCreate = (rawBot: Bot, interaction: Interaction) => {
	const bot = rawBot as BotWithCache;
	if (interaction.data && interaction.id) {
		if (interaction.data.name && commandNames.includes(interaction.data.name)) {
			const cmdIdx = commandNames.indexOf(interaction.data.name);
			commands[cmdIdx].execute(bot, interaction);
			return;
		}

		const customId = interaction.data.customId ? interaction.data.customId.replace(/\$/g, '') : '';
		if (customId && buttonNames.includes(customId)) {
			const btnIdx = buttonNames.indexOf(customId);
			buttons[btnIdx].execute(bot, interaction);
			return;
		}

		console.log('interaction NOT HANDLED');
	}
};
