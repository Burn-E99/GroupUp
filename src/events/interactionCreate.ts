import { Bot, BotWithCache, Interaction } from '../../deps.ts';
import { commands } from '../commands/_index.ts';

import { Button } from '../types/commandTypes.ts';
import { createEventButton } from '../buttons/event-creation/step1-gameSelection.ts';

const buttons: Array<Button> = [createEventButton];

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

		const customId = interaction.data.customId ? interaction.data.customId.replace(/\$/g, '') : ''
		if (customId && buttonNames.includes(customId)) {
			const btnIdx = buttonNames.indexOf(customId);
			buttons[btnIdx].execute(bot, interaction);
			return;
		}

		console.log('interaction NOT HANDLED')
	}
};
