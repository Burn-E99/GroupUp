import config from '../config.ts';

export const failColor = 0xe71212;
export const warnColor = 0xe38f28;
export const successColor = 0x0f8108;
export const infoColor1 = 0x313bf9;
export const infoColor2 = 0x6805e9;

export const getRandomStatus = (guildCount: number): string => {
	let status = '';
	switch (Math.floor((Math.random() * 5) + 1)) {
		case 1:
			status = `${config.prefix}help for commands`;
			break;
		case 2:
			status = `Running V${config.version}`;
			break;
		case 3:
			status = `${config.prefix}info to learn more`;
			break;
		case 4:
			status = 'Mention me to check my prefix!';
			break;
		default:
			status = `Running LFGs in ${guildCount} servers`;
			break;
	}

	return status;
};
