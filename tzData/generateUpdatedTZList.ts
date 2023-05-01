// Get file and inits
const csvTZDataU8 = Deno.readFileSync('./tzTable.csv');
const csvTZData = new TextDecoder().decode(csvTZDataU8);
const csvRows = csvTZData.split('\r\n');
const tzMap: Map<string, string> = new Map();

// Overrides because the world had to be special
const tzOverrides: Array<Array<string>> = [
	['CDT', '-05:00'],
	['CST', '-06:00'],
	['PST', '-08:00'],
	['IST', '+05:30'],
];
const abbrOverrides: Array<string> = tzOverrides.map(tzSet => tzSet[0]);

// Prefill the map
for (const override of tzOverrides) {
	tzMap.set(override[0], override[1]);
}

// Attempt to add tz to the map
const attemptAdd = (tzAbbr: string, tzOffset: string) => {
	if (!abbrOverrides.includes(tzAbbr)) {
		if (tzMap.has(tzAbbr) && tzMap.get(tzAbbr) !== tzOffset) {
			console.error(`DOUBLED TZ ABBR WITH DIFF OFFSETS: ${tzAbbr} | ${tzOffset} | ${tzMap.get(tzAbbr)}`)
		} else {
			if (!tzAbbr.includes('+') && !tzAbbr.includes('-')) {
				tzMap.set(tzAbbr, tzOffset);
			}
		}
	}
};

// Get each TZ from the csv
for (const row of csvRows) {
	const [rawSTDOffset, rawDSTOffset, rawSTDAbbr, rawDSTAbbr] = row.replaceAll('?', '-').toUpperCase().split(',');
	const STDOffset = (rawSTDOffset || '');
	const DSTOffset = (rawDSTOffset || '');
	const STDAbbr = (rawSTDAbbr || '');
	const DSTAbbr = (rawDSTAbbr || '');

	attemptAdd(STDAbbr, STDOffset);
	if (STDAbbr !== DSTAbbr) {
		attemptAdd(DSTAbbr, DSTOffset);
	}
}

// Log it out to copy to source
const tzIt = tzMap.entries();
let tzVal = tzIt.next()
while (!tzVal.done) {
	if (tzVal.value[0]) {
		console.log(`['${tzVal.value[0]}','${tzVal.value[1]}'],`);
	}
	tzVal = tzIt.next();
}
