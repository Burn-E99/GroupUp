export const determineTZ = (tz: string, userOverride = false): [string, boolean] => {
	tz = tz.toUpperCase();

	let overrode = false;
	const shortHandUSTZ = (tz === "ET" || tz === "CT" || tz === "MT" || tz === "PT");
	const fullUSTZ = (tz.length === 3 && (tz.startsWith("E") || tz.startsWith("C") || tz.startsWith("M") || tz.startsWith("P")) && (tz.endsWith("DT") || tz.endsWith("ST")));

	if (!userOverride && (shortHandUSTZ || fullUSTZ)) {
		const today = new Date();
		const jan = new Date(today.getFullYear(), 0, 1);
		const jul = new Date(today.getFullYear(), 6, 1);
		if (today.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())) {
			if (tz.includes("S")) overrode = true;
			tz = `${tz.substr(0, 1)}DT`;
		} else {
			if (tz.includes("D")) overrode = true;
			tz = `${tz.substr(0, 1)}ST`;
		}
	}

	return [tz, overrode];
};
