export const determineTZ = (tz: string): string => {
	tz = tz.toUpperCase();

	if (tz === "ET" || tz === "CT" || tz === "MT" || tz === "PT") {
		const today = new Date();
		const jan = new Date(today.getFullYear(), 0, 1);
		const jul = new Date(today.getFullYear(), 6, 1);
		if (today.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())) {
			tz = `${tz.substr(0, 1)}DT`;
		} else {
			tz = `${tz.substr(0, 1)}ST`;
		}
	}

	return tz;
};
