import { Activity } from './activities.ts';
import { SelectOption, ActionRow, MessageComponentTypes } from '../../../deps.ts';

export const pathIdxSeparator = '|';
export const pathIdxEnder = '&';

export const getNestedActivity = (idxPath: Array<number>, activities: Array<Activity>): Array<Activity> => {
	const nextIdx = idxPath[0];
	if (idxPath.length && activities[nextIdx] && activities[nextIdx].options) {
		idxPath.shift();
		return getNestedActivity(idxPath, activities[nextIdx].options || []);
	} else {
		return activities;
	}
};

const getSelectOptions = (baseValue: string, activities: Array<Activity>, defaultIdx?: number): Array<SelectOption> => activities.map((act, idx) => ({
	label: act.name,
	value: `${baseValue}${idx}${act.maxMembers ? pathIdxEnder : pathIdxSeparator}`,
	default: idx === defaultIdx,
}));

export const generateActionRow = (baseValue: string, activities: Array<Activity>, customId: string, defaultIdx?: number): ActionRow => ({
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.SelectMenu,
		customId,
		options: getSelectOptions(baseValue, activities, defaultIdx),
	}],
});

export const generateMapId = (guildId: bigint, channelId: bigint, userId: bigint) => `${guildId}-${channelId}-${userId}`;
