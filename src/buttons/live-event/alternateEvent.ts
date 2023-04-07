import { Bot, Interaction } from '../../../deps.ts';

export const customId = 'alternateEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {};

export const alternateEventButton = {
	customId,
	execute,
};
