export const jsonParseBig = (input: string) => {
	return JSON.parse(input, (_key, value) => {
		if (typeof value === 'string' && /^\d+n$/.test(value)) {
			return BigInt(value.substring(0, value.length - 1));
		}
		return value;
	});
};

export const jsonStringifyBig = (input: any) => {
	return JSON.stringify(input, (_key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value);
};
