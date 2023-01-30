import config from '../../../config.ts';
import { ApplicationCommandFlags, ApplicationCommandTypes, Bot, Interaction, InteractionResponseTypes } from '../../../deps.ts';
import { CommandDetails } from "../../types/commandTypes.ts";


export const customId = 'gameSel';
const details: CommandDetails = {
	name: 'create-event',
	description: 'Creates a new event in this channel.',
	type: ApplicationCommandTypes.ChatInput,
};

const execute = (bot: Bot, interaction: Interaction) => {

};

export const createEventCommand = {
	details,
	execute,
};

export const createEventButton = {
	customId,
	execute,
};