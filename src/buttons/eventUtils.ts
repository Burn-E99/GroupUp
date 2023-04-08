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
export const lfgStartTimeName = 'Start Time:';
export const idSeparator = '@';
export const noMembersStr = 'None';
export const leaveEventBtnStr = 'Leave';

// Member List generators
export const generateMemberTitle = (memberList: Array<LFGMember>, maxMembers: number): string => `Members Joined: ${memberList.length}/${maxMembers}`;
export const generateMemberList = (memberList: Array<LFGMember>): string => memberList.length ? memberList.map((member) => `${member.name} - <@${member.id}>`).join('\n') : noMembersStr;
export const generateAlternateList = (alternateList: Array<LFGMember>): string =>
	alternateList.length ? alternateList.map((member) => `${member.name} - <@${member.id}>${member.joined ? ' *' : ''}`).join('\n') : noMembersStr;