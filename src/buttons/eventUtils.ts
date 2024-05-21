import config from '../../config.ts';
import { ActionRow, MessageComponentTypes, TextStyles } from '../../deps.ts';
import { LFGMember } from '../types/commandTypes.ts';
import { isDSTActive } from './event-creation/dateTimeUtils.ts';

// Index enum to standardize access to the field
export enum LfgEmbedIndexes {
	Activity,
	StartTime,
	ICSLink,
	Description,
	JoinedMembers,
	AlternateMembers,
}

// Common strings
export const idSeparator = '@';
export const pathIdxSeparator = '|';
export const pathIdxEnder = '&';
export const fillerChar = '$';
export const lfgStartTimeName = 'Start Time:';
export const noMembersStr = 'None';
export const joinEventBtnStr = 'Join';
export const requestToJoinEventBtnStr = 'Request to Join';
export const leaveEventBtnStr = 'Leave';
export const alternateEventBtnStr = 'Join as Alternate';
export const noDescProvided = 'No description provided.';

// Member List generators
export const generateMemberTitle = (memberList: Array<LFGMember>, maxMembers: number): string => `Members Joined: ${memberList.length}/${maxMembers}`;
export const generateMemberList = (memberList: Array<LFGMember>): string => memberList.length ? memberList.map((member) => `${member.name} - <@${member.id}>`).join('\n') : noMembersStr;
export const generateAlternateList = (alternateList: Array<LFGMember>): string =>
	alternateList.length ? alternateList.map((member) => `${member.name} - <@${member.id}>${member.joined ? ' *' : ''}`).join('\n') : noMembersStr;

// Fields for event creation and editing modals
export const eventTimeId = 'eventTime';
export const eventTimeZoneId = 'eventTimeZone';
export const eventDateId = 'eventDate';
export const eventDescriptionId = 'eventDescription';

export const descriptionTextField = (prefillDescription = ''): ActionRow => ({
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: eventDescriptionId,
		label: 'Description:',
		placeholder: 'Briefly describe the event',
		style: TextStyles.Paragraph,
		required: false,
		minLength: 0,
		maxLength: 1000,
		value: prefillDescription || undefined,
	}],
});

// DST notice to try to get people to use the right TZ
const dstNotice = isDSTActive() ? '(Note: DST is in effect in NA)' : '';
export const dateTimeFields = (prefillTime = '', prefillTimeZone = '', prefillDate = ''): ActionRow[] => [{
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: eventTimeId,
		label: 'Start Time:',
		placeholder: 'Enter the start time as "HH:MM AM/PM"',
		style: TextStyles.Short,
		minLength: 1,
		maxLength: 8,
		value: prefillTime || undefined,
	}],
}, {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: eventTimeZoneId,
		label: `Time Zone: ${dstNotice}`,
		placeholder: 'Enter your time zone abbreviation (UTC±## also works)',
		style: TextStyles.Short,
		minLength: 2,
		maxLength: 8,
		value: prefillTimeZone || undefined,
	}],
}, {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: eventDateId,
		label: 'Start Date:',
		placeholder: `Enter date as "${config.defaultDateFormat}" or "Month Day, Year"`,
		style: TextStyles.Short,
		minLength: 1,
		maxLength: 20,
		value: prefillDate || undefined,
	}],
}];

export const activityTitleId = 'activityTitle';
export const activitySubtitleId = 'activitySubtitle';
export const activityMaxPlayersId = 'activityMaxPlayers';
export const generateCustomActivityFields = (actTitle = '', actSubtitle = '', activityMaxPlayers = ''): ActionRow[] => [{
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: activityTitleId,
		label: 'Activity Title:',
		placeholder: 'The name of the game or event.',
		style: TextStyles.Short,
		minLength: 1,
		maxLength: 35,
		value: actTitle || undefined,
	}],
}, {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: activitySubtitleId,
		label: 'Activity Subtitle:',
		placeholder: 'The specific activity within the game or event.',
		style: TextStyles.Short,
		minLength: 1,
		maxLength: 50,
		value: actSubtitle || undefined,
	}],
}, {
	type: MessageComponentTypes.ActionRow,
	components: [{
		type: MessageComponentTypes.InputText,
		customId: activityMaxPlayersId,
		label: 'Maximum Players:',
		placeholder: 'Please enter a number between 1 and 99.',
		style: TextStyles.Short,
		minLength: 1,
		maxLength: 2,
		value: activityMaxPlayers || undefined,
	}],
}];
