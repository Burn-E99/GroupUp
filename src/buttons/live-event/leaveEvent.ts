import { Bot, Interaction } from '../../../deps.ts';

export const customId = 'leaveEvent';

export const execute = async (bot: Bot, interaction: Interaction) => {};

export const leaveEventButton = {
	customId,
	execute,
};
