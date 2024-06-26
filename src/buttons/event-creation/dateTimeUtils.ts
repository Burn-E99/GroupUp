import config from '../../../config.ts';
import { editEventDetailsBtnName } from './utils.ts';

enum DateTimeFormats {
	MMDDYYYY = 'MONTH/DAY/YEAR',
	DDMMYYYY = 'DAY/MONTH/YEAR',
}
const monthsLong: Array<string> = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
export const monthsShort: Array<string> = monthsLong.map((month) => month.slice(0, 3));
const tzMap: Map<string, string> = new Map([
	['CDT', '-05:00'],
	['CST', '-06:00'],
	['PST', '-08:00'],
	['IST', '+05:30'],
	['GMT', '+00:00'],
	['EAT', '+03:00'],
	['CET', '+01:00'],
	['WAT', '+01:00'],
	['CAT', '+02:00'],
	['EET', '+02:00'],
	['CEST', '+02:00'],
	['SAST', '+02:00'],
	['HST', '-10:00'],
	['HDT', '-09:00'],
	['AKST', '-09:00'],
	['AKDT', '-08:00'],
	['AST', '-04:00'],
	['EST', '-05:00'],
	['MST', '-07:00'],
	['MDT', '-06:00'],
	['EDT', '-04:00'],
	['PDT', '-07:00'],
	['ADT', '-03:00'],
	['NST', '-03:30'],
	['NDT', '-02:30'],
	['AEST', '+10:00'],
	['AEDT', '+11:00'],
	['NZST', '+12:00'],
	['NZDT', '+13:00'],
	['EEST', '+03:00'],
	['HKT', '+08:00'],
	['WIB', '+07:00'],
	['WIT', '+09:00'],
	['IDT', '+03:00'],
	['PKT', '+05:00'],
	['WITA', '+08:00'],
	['KST', '+09:00'],
	['JST', '+09:00'],
	['WET', '+00:00'],
	['WEST', '+01:00'],
	['ACST', '+09:30'],
	['ACDT', '+10:30'],
	['AWST', '+08:00'],
	['UTC', '+00:00'],
	['BST', '+01:00'],
	['MSK', '+03:00'],
	['MET', '+01:00'],
	['MEST', '+02:00'],
	['CHST', '+10:00'],
	['SST', '-11:00'],
]);
const shorthandUSTZ: Array<string> = ['ET', 'CT', 'MT', 'PT', 'HT', 'AKT'];
const allUSTZ: Array<string> = ['EST', 'CST', 'MST', 'PST', 'HST', 'AKST', 'EDT', 'CDT', 'MDT', 'PDT', 'HDT', 'AKDT'];

// Takes user input Time and makes it actually usable
const parseEventTime = (preParsedEventTime: string): [string, string, string] => {
	let parsedEventTimePeriod = '';
	// Get AM or PM out of the rawTime
	if (preParsedEventTime.endsWith('AM') || preParsedEventTime.endsWith('PM')) {
		parsedEventTimePeriod = preParsedEventTime.slice(-2);
		preParsedEventTime = preParsedEventTime.slice(0, -2).trim();
	}
	let parsedEventTimeHours: string;
	let parsedEventTimeMinutes: string;
	// Get Hours and Minutes out of rawTime
	if (preParsedEventTime.length > 2) {
		parsedEventTimeMinutes = preParsedEventTime.slice(-2);
		parsedEventTimeHours = preParsedEventTime.slice(0, -2).trim();
	} else {
		parsedEventTimeHours = preParsedEventTime.trim();
		parsedEventTimeMinutes = '00';
	}
	// Determine if we need to remove the time period
	if (parseInt(parsedEventTimeHours) > 12) {
		parsedEventTimePeriod = '';
	}

	if (!parsedEventTimePeriod && parsedEventTimeHours.length < 2) {
		parsedEventTimeHours = `0${parsedEventTimeHours}`;
	}

	return [parsedEventTimeHours, parsedEventTimeMinutes, parsedEventTimePeriod];
};

// Check if DST is currently active
export const isDSTActive = (): boolean => {
	const today = new Date();
	const jan = new Date(today.getFullYear(), 0, 1);
	const jul = new Date(today.getFullYear(), 6, 1);

	return today.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

const editButtonMessage = `click \`${editEventDetailsBtnName}\` and change`;
const warningText = (incorrectTZ: string, correctTZ: string, newEvent: boolean) =>
	`⚠️⚠️⚠️ WARNING! Did you mean to enter \`${incorrectTZ}\` for the time zone? ⚠️⚠️⚠️\nCurrently (as of the posting of this message), Daylight Savings Time is ${
		isDSTActive() ? '' : 'not '
	}active in most of the United States.  If DST is ${isDSTActive() ? '' : 'not '}in effect for you (and will be when this event is scheduled to happen), ${
		newEvent ? editButtonMessage : 'please dismiss this message and start over, using'
	} the time zone ${newEvent ? 'to ' : ''}\`${correctTZ}\`, or shorten it to \`${correctTZ.slice(0, -2)}T\` to let ${config.name} automatically use the correct time zone.\n\n`;

const usTZDSTCheck = (timeZone: string, newEvent: boolean): string => {
	if (allUSTZ.includes(timeZone)) {
		if (isDSTActive() && timeZone.endsWith('ST')) {
			return warningText(timeZone, `${timeZone.slice(0, -2)}DT`, newEvent);
		} else if (!isDSTActive() && timeZone.endsWith('DT')) {
			return warningText(timeZone, `${timeZone.slice(0, -2)}ST`, newEvent);
		}
	}
	return '';
};

// Takes user input Time Zone and makes it actually usable
const parseEventTimeZone = (preParsedEventTimeZone: string): [string, string] => {
	if (shorthandUSTZ.includes(preParsedEventTimeZone)) {
		// Handle shorthand US timezones, adding S for standard time and D for Daylight Savings
		if (isDSTActive()) {
			preParsedEventTimeZone = `${preParsedEventTimeZone.slice(0, -1)}DT`;
		} else {
			preParsedEventTimeZone = `${preParsedEventTimeZone.slice(0, -1)}ST`;
		}
	}
	if (tzMap.has(preParsedEventTimeZone)) {
		// TZ is proper abbreviation, use our map to convert
		return [`UTC${tzMap.get(preParsedEventTimeZone)}`, preParsedEventTimeZone];
	} else {
		// Determine if user put in UTC4, which needs to be UTC+4
		let addPlusSign = false;
		if (!preParsedEventTimeZone.includes('+') && !preParsedEventTimeZone.includes('-')) {
			addPlusSign = true;
		}
		// Determine if we need to prepend UTC/GMT, handle adding the + into the string
		if (!preParsedEventTimeZone.startsWith('UTC') || preParsedEventTimeZone.startsWith('GMT')) {
			preParsedEventTimeZone = `UTC${addPlusSign ? '+' : ''}${preParsedEventTimeZone.startsWith('GMT') ? preParsedEventTimeZone.slice(3) : preParsedEventTimeZone}`;
		} else if (addPlusSign) {
			preParsedEventTimeZone = `${preParsedEventTimeZone.slice(0, 3)}+${preParsedEventTimeZone.slice(3)}`;
		}
		return [preParsedEventTimeZone, preParsedEventTimeZone];
	}
};

const determineDateTimeOrder = (parsedSlot1: string, parsedSlot2: string, parsedSlot3: string): [string, string, string] => {
	// Default these to MMDDYYYY in case something goes wrong and does not properly override them
	let parsedEventMonth = parsedSlot1;
	let parsedEventDay = parsedSlot2;
	let parsedEventYear = parsedSlot3;

	const slot1AsInt = parseInt(parsedSlot1);
	const slot2AsInt = parseInt(parsedSlot2);
	if (!isNaN(slot1AsInt) && slot1AsInt > 999) {
		// First parsing slot appears to be a year, assume user used ISO8601 format
		parsedEventYear = parsedSlot1;
		parsedEventMonth = parsedSlot2;
		parsedEventDay = parsedSlot3;
	} else if (!isNaN(slot1AsInt) && slot1AsInt > 12) {
		// First parsing slot appears to be a day, assume user used DDMMYYYY format
		parsedEventDay = parsedSlot1;
		parsedEventMonth = parsedSlot2;
		parsedEventYear = parsedSlot3;
	} else if (!isNaN(slot2AsInt) && slot2AsInt > 12) {
		// Second parsing slot appears to be a day, assume user used MMDDYYYY format
		parsedEventMonth = parsedSlot1;
		parsedEventDay = parsedSlot2;
		parsedEventYear = parsedSlot3;
	} else if (config.defaultDateFormat === DateTimeFormats.DDMMYYYY) {
		// Year was not first, and cannot locate a day from the string, fall back to bot's default setting
		parsedEventDay = parsedSlot1;
		parsedEventMonth = parsedSlot2;
		parsedEventYear = parsedSlot3;
	} else if (config.defaultDateFormat === DateTimeFormats.MMDDYYYY) {
		// Year was not first, and cannot locate a day from the string, fall back to bot's default setting
		parsedEventMonth = parsedSlot1;
		parsedEventDay = parsedSlot2;
		parsedEventYear = parsedSlot3;
	}

	return [parsedEventMonth, parsedEventDay, parsedEventYear];
};

// Takes user input Date and makes it actually usable
const parseEventDate = (preParsedEventDate: string): [string, string, string] => {
	const today = new Date();
	const [parsedSlot1, parsedSlot2, parsedSlot3] = preParsedEventDate.split(/[\s,\\/-]+/g);
	let [parsedEventMonth, parsedEventDay, parsedEventYear] = determineDateTimeOrder(parsedSlot1, parsedSlot2, parsedSlot3);

	if (isNaN(parseInt(parsedEventDay))) {
		// User only provided one word, we're assuming it was TOMORROW, and all others will be treated as today
		if (parsedEventMonth.includes('TOMORROW')) {
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			parsedEventYear = tomorrow.getFullYear().toString();
			parsedEventMonth = monthsLong[tomorrow.getMonth()];
			parsedEventDay = tomorrow.getDate().toString();
		} else {
			parsedEventYear = today.getFullYear().toString();
			parsedEventMonth = monthsLong[today.getMonth()];
			parsedEventDay = today.getDate().toString();
		}
	} else {
		// Month and Day exist, so determine year and parse month/day
		parsedEventYear = (isNaN(parseInt(parsedEventYear)) ? today.getFullYear() : parseInt(parsedEventYear)).toString();
		parsedEventDay = parseInt(parsedEventDay).toString();
		if (!monthsLong.includes(parsedEventMonth) && !monthsShort.includes(parsedEventMonth)) {
			parsedEventMonth = monthsShort[parseInt(parsedEventMonth) - 1];
		}
	}

	return [parsedEventYear, parsedEventMonth, parsedEventDay];
};

// Take full raw Date/Time input and convert it to a proper Date
export const getDateFromRawInput = (rawEventTime: string, rawEventTimeZone: string, rawEventDate: string, newEvent: boolean): [Date, string, boolean, boolean, string] => {
	// Verify/Set Time
	const [parsedEventTimeHours, parsedEventTimeMinutes, parsedEventTimePeriod] = parseEventTime(rawEventTime.replaceAll(':', '').toUpperCase());

	// Verify/Set Time Zone
	const [parsedEventTimeZone, userInputTimeZone] = parseEventTimeZone(rawEventTimeZone.replaceAll(' ', '').trim().toUpperCase());
	const usTZWarning = usTZDSTCheck(userInputTimeZone, newEvent);

	// Verify/Set Date
	const [parsedEventYear, parsedEventMonth, parsedEventDay] = parseEventDate(rawEventDate.trim().toUpperCase());

	const parsedDateTime = new Date(`${parsedEventMonth} ${parsedEventDay}, ${parsedEventYear} ${parsedEventTimeHours}:${parsedEventTimeMinutes} ${parsedEventTimePeriod} ${parsedEventTimeZone}`);
	return [
		parsedDateTime,
		`${parsedEventTimeHours}${parsedEventTimePeriod ? ':' : ''}${parsedEventTimeMinutes} ${parsedEventTimePeriod} ${userInputTimeZone} ${parsedEventMonth.slice(0, 1)}${
			parsedEventMonth.slice(1, 3).toLowerCase()
		} ${parsedEventDay}, ${parsedEventYear}`,
		parsedDateTime.getTime() > new Date().getTime(),
		!isNaN(parsedDateTime.getTime()),
		usTZWarning,
	];
};
