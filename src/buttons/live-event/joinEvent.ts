import { Bot, Interaction } from '../../../deps.ts';

export const customId = 'joinEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {};

export const joinEventButton = {
	customId,
	execute,
};
