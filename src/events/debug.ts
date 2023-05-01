import {
	// Log4Deno deps
	log,
	LT,
} from '../../deps.ts';
import utils from '../utils.ts';

export const debug = (dmsg: string) => log(LT.LOG, `Debug Message | ${utils.jsonStringifyBig(dmsg)}`);
