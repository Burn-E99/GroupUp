import { ActionRow, ApplicationCommandFlags, ButtonComponent, ButtonStyles, InteractionResponse, InteractionResponseTypes, MessageComponentTypes, SelectOption } from '../../../deps.ts';
import config from '../../../config.ts';
import { Activity } from './activities.ts';
import {
	alternateEventBtnStr,
	generateAlternateList,
	generateMemberList,
	generateMemberTitle,
	idSeparator,
	joinEventBtnStr,
	leaveEventBtnStr,
	lfgStartTimeName,
	pathIdxEnder,
	pathIdxSeparator,
	requestToJoinEventBtnStr,
} from '../eventUtils.ts';
import { selfDestructMessage } from '../tokenCleanup.ts';
import { successColor, warnColor } from '../../commandUtils.ts';
import { LFGMember } from '../../types/commandTypes.ts';
import { customId as gameSelCustomId } from './step1-gameSelection.ts';
import { customId as createEventCustomId } from './step3-createEvent.ts';
import { customId as joinEventCustomId } from '../live-event/joinEvent.ts';
import { customId as leaveEventCustomId } from '../live-event/leaveEvent.ts';
import { customId as alternateEventCustomId } from '../live-event/alternateEvent.ts';
import { customId as deleteEventCustomId } from '../live-event/deleteEvent.ts';
import { customId as editEventCustomId } from '../live-event/editEvent.ts';

export const getNestedActivity = (idxPath: Array<number>, activities: Array<Activity>): Array<Activity> => {
	const nextIdx = idxPath[0];
	if (idxPath.length && activities[nextIdx]?.options) {
		idxPath.shift();
		return getNestedActivity(idxPath, activities[nextIdx].options || []);
	} else {
		return activities;
	}
};

export const getFinalActivity = (idxPath: Array<number>, activities: Array<Activity>): Activity => getNestedActivity(idxPath, activities)[idxPath[idxPath.length - 1]];

const getSelectOptions = (baseValue: string, activities: Array<Activity>, defaultIdx?: number): Array<SelectOption> =>
	activities.map((act, idx) => ({
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

const createEventBtnName = 'Create Event';
const createWhitelistedBtnName = 'Create Whitelisted Event';
const editEventDetailsBtnName = 'Edit Event Details';
export const invalidDateTimeStr = '`Invalid Date/Time`';
const finalizeButtons = (idxPath: string, eventInFuture: boolean): [ButtonComponent, ButtonComponent, ButtonComponent] | [ButtonComponent] => {
	const editButton: ButtonComponent = {
		type: MessageComponentTypes.Button,
		label: editEventDetailsBtnName,
		style: ButtonStyles.Secondary,
		customId: `${gameSelCustomId}${idSeparator}${idxPath}${pathIdxEnder}`,
	};
	if (eventInFuture) {
		return [{
			type: MessageComponentTypes.Button,
			label: createEventBtnName,
			style: ButtonStyles.Success,
			customId: createEventCustomId,
		}, {
			type: MessageComponentTypes.Button,
			label: createWhitelistedBtnName,
			style: ButtonStyles.Primary,
			customId: `${createEventCustomId}${idSeparator}`,
		}, editButton];
	} else {
		return [editButton];
	}
};

export const generateLFGButtons = (whitelist: boolean): [ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent, ButtonComponent] => [{
	type: MessageComponentTypes.Button,
	label: whitelist ? requestToJoinEventBtnStr : joinEventBtnStr,
	style: ButtonStyles.Success,
	customId: `${joinEventCustomId}${whitelist ? idSeparator : ''}`,
}, {
	type: MessageComponentTypes.Button,
	label: leaveEventBtnStr,
	style: ButtonStyles.Danger,
	customId: leaveEventCustomId,
}, {
	type: MessageComponentTypes.Button,
	label: alternateEventBtnStr,
	style: ButtonStyles.Primary,
	customId: alternateEventCustomId,
}, {
	type: MessageComponentTypes.Button,
	label: '',
	style: ButtonStyles.Secondary,
	customId: editEventCustomId,
	emoji: {
		name: '✏️',
	},
}, {
	type: MessageComponentTypes.Button,
	label: '',
	style: ButtonStyles.Secondary,
	customId: deleteEventCustomId,
	emoji: {
		name: '🗑️',
	},
}];

export const generateTimeFieldStr = (eventDateTimeStr: string, eventDateTime: Date) => `${eventDateTimeStr}\n<t:${Math.floor(eventDateTime.getTime() / 1000)}:R>`;

export const createLFGPost = (
	category: string,
	activity: Activity,
	eventDateTime: Date,
	eventDateTimeStr: string,
	eventDescription: string,
	authorId: bigint,
	author: string,
	memberList: Array<LFGMember>,
	alternateList: Array<LFGMember>,
	idxPath: string,
	eventInFuture: boolean,
	dateTimeValid: boolean,
): InteractionResponse => {
	const icsDetails = `${category}: ${activity.name}`;
	const dateTimePastFutureStr = dateTimeValid ? 'in the past' : 'with an invalid date/time';
	const dateTimeValidStr = dateTimeValid ? 'in the future' : 'valid';
	return {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			content: eventInFuture
				? `Please verify the information below, then click on the \`${createEventBtnName}\` or \`${createWhitelistedBtnName}\` button, or change the event \`Date/Time\` or \`Description\` with the \`${editEventDetailsBtnName}\` button below. \n\n${
					selfDestructMessage(new Date().getTime())
				}`
				: `You cannot create an event ${dateTimePastFutureStr}.  Please change the event's \`Date/Time\` to be ${dateTimeValidStr} with the \`${editEventDetailsBtnName}\` button below.`,
			embeds: [{
				color: eventInFuture ? successColor : warnColor,
				fields: [{
					name: `${category}:`,
					value: activity.name,
					inline: true,
				}, {
					name: lfgStartTimeName,
					value: dateTimeValid ? generateTimeFieldStr(eventDateTimeStr, eventDateTime) : invalidDateTimeStr,
					inline: true,
				}, {
					name: 'Add to Calendar:',
					value: `[Download ICS File](${config.links.addToCalendar}?t=${eventDateTime.getTime()}&n=${icsDetails.replaceAll(' ', '+')})`,
					inline: true,
				}, {
					name: 'Description:',
					value: eventDescription,
				}, {
					name: generateMemberTitle(memberList, activity.maxMembers ?? 0),
					value: generateMemberList(memberList),
					inline: true,
				}, {
					name: 'Alternates:',
					value: generateAlternateList(alternateList),
					inline: true,
				}],
				footer: {
					text: `Created by: ${author}`,
					iconUrl: `${config.links.creatorIcon}#${authorId}`,
				},
				timestamp: eventDateTime.getTime(),
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: finalizeButtons(idxPath, eventInFuture),
			}],
		},
	};
};
