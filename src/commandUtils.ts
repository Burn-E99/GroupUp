import { ApplicationCommandFlags } from '../deps.ts';
import config from '../config.ts';
import { lfgChannels } from './db.ts';

export const failColor = 0xe71212;
export const warnColor = 0xe38f28;
export const successColor = 0x0f8108;
export const infoColor1 = 0x313bf9;
export const infoColor2 = 0x6805e9;

export const getRandomStatus = (guildCount: number): string => {
	const statuses = [
		`Running V${config.version}`,
		`${config.prefix}info to learn more`,
		`Running LFGs in ${guildCount} servers`,
	];
	return statuses[Math.floor((Math.random() * statuses.length) + 1)];
};

export const isLFGChannel = (channelId: bigint) => {
	return (lfgChannels.includes(channelId) || channelId === 0n) ? ApplicationCommandFlags.Ephemeral : undefined;
};
