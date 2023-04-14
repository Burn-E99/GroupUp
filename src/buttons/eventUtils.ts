import { LFGMember } from '../types/commandTypes.ts';

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
export const lfgStartTimeName = 'Start Time:';
export const noMembersStr = 'None';
export const joinEventBtnStr = 'Join';
export const requestToJoinEventBtnStr = 'Request to Join';
export const leaveEventBtnStr = 'Leave';
export const alternateEventBtnStr = 'Join as Alternate';

// Member List generators
export const generateMemberTitle = (memberList: Array<LFGMember>, maxMembers: number): string => `Members Joined: ${memberList.length}/${maxMembers}`;
export const generateMemberList = (memberList: Array<LFGMember>): string => memberList.length ? memberList.map((member) => `${member.name} - <@${member.id}>`).join('\n') : noMembersStr;
export const generateAlternateList = (alternateList: Array<LFGMember>): string =>
	alternateList.length ? alternateList.map((member) => `${member.name} - <@${member.id}>${member.joined ? ' *' : ''}`).join('\n') : noMembersStr;
