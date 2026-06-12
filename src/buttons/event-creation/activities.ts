import { log, LT } from '../../../deps.ts';

// Activity should either have maxMembers or options specified, NOT both
export type Activity = {
	name: string;
	maxMembers?: number;
	options?: Array<Activity>;
};

// Max depth is limited to 4, 5th component row must be reserved for the custom button
export const Activities: Array<Activity> = [
	{
		name: 'Destiny 2',
		options: [
			{
				name: 'Raids',
				options: [
					{
						name: 'The Desert Perpetual (Epic)',
						maxMembers: 6,
					},
					{
						name: 'The Desert Perpetual',
						maxMembers: 6,
					},
					{
						name: "Salvation's Edge",
						maxMembers: 6,
					},
					{
						name: "Crota's End",
						maxMembers: 6,
					},
					{
						name: 'Root of Nightmares',
						maxMembers: 6,
					},
					{
						name: "King's Fall",
						maxMembers: 6,
					},
					{
						name: 'Vow of the Disciple',
						maxMembers: 6,
					},
					{
						name: 'Vault of Glass',
						maxMembers: 6,
					},
					{
						name: 'Deep Stone Crypt',
						maxMembers: 6,
					},
					{
						name: 'Garden of Salvation',
						maxMembers: 6,
					},
					{
						name: 'Last Wish',
						maxMembers: 6,
					},
				],
			},
			{
				name: 'Dungeons',
				options: [
					{
						name: 'Equilibrium',
						maxMembers: 3,
					},
					{
						name: 'Sundered Doctrine',
						maxMembers: 3,
					},
					{
						name: "Vesper's Host",
						maxMembers: 3,
					},
					{
						name: "Warlord's Ruin",
						maxMembers: 3,
					},
					{
						name: 'Ghosts of the Deep',
						maxMembers: 3,
					},
					{
						name: 'Spire of the Watcher',
						maxMembers: 3,
					},
					{
						name: 'Duality',
						maxMembers: 3,
					},
					{
						name: 'Grasp of Avarice',
						maxMembers: 3,
					},
					{
						name: 'Prophecy',
						maxMembers: 3,
					},
					{
						name: 'Pit of Heresy',
						maxMembers: 3,
					},
					{
						name: 'Shattered Throne',
						maxMembers: 3,
					},
				],
			},
			{
				name: 'Pantheon',
				options: [
					{
						name: 'Calus Resplendent',
						maxMembers: 6,
					},
					{
						name: 'Morgeth Surpassing',
						maxMembers: 6,
					},
				],
			},
			{
				name: 'Crucible',
				options: [
					{
						name: 'Rumble',
						maxMembers: 6,
					},
					{
						name: 'Control',
						maxMembers: 6,
					},
					{
						name: 'Competitive',
						maxMembers: 3,
					},
					{
						name: 'Mayhem',
						maxMembers: 6,
					},
					{
						name: 'Lockdown',
						maxMembers: 6,
					},
					{
						name: 'Sparrow Racing League',
						maxMembers: 3,
					},
					{
						name: 'Iron Banner',
						maxMembers: 6,
					},
					{
						name: 'Trials of Osiris',
						maxMembers: 3,
					},
					{
						name: 'Private Match',
						maxMembers: 12,
					},
				],
			},
			{
				name: 'Gambit',
				options: [
					{
						name: 'Classic',
						maxMembers: 4,
					},
					{
						name: 'Private Match',
						maxMembers: 8,
					},
				],
			},
			{
				name: 'Vanguard',
				options: [
					{
						name: 'Quickplay',
						maxMembers: 3,
					},
					{
						name: 'Quickplay: Master',
						maxMembers: 3,
					},
					{
						name: 'Grandmaster',
						maxMembers: 3,
					},
					{
						name: 'Arena',
						options: [
							{
								name: 'Quickplay',
								maxMembers: 3,
							},
							{
								name: 'Quickplay: Master',
								maxMembers: 3,
							},
							{
								name: 'Nightmare Containment',
								maxMembers: 3,
							},
							{
								name: 'Ketchcrash',
								maxMembers: 3,
							},
							{
								name: 'Astral Alignment',
								maxMembers: 3,
							},
							{
								name: 'Override: Europa',
								maxMembers: 3,
							},
						],
					},
				],
			},
			{
				name: 'Exotic Missions',
				options: [
					{
						name: '//node.ovrd.AVALON//',
						maxMembers: 3,
					},
					{
						name: 'Heliostat',
						maxMembers: 3,
					},
					{
						name: 'Derealize',
						maxMembers: 3,
					},
					{
						name: "Kell's Fall",
						maxMembers: 3,
					},
					{
						name: 'Encore',
						maxMembers: 3,
					},
					{
						name: 'Starcrossed',
						maxMembers: 3,
					},
					{
						name: "Operation: Seraph's Shield",
						maxMembers: 3,
					},
					{
						name: 'Vox Obscura',
						maxMembers: 3,
					},
					{
						name: 'Presage',
						maxMembers: 3,
					},
					{
						name: 'Zero Hour',
						maxMembers: 3,
					},
					{
						name: 'The Whisper',
						maxMembers: 3,
					},
				],
			},
			{
				name: 'Miscellaneous/Seasonal',
				options: [
					{
						name: 'Onslaught',
						maxMembers: 3,
					},
					{
						name: 'Crawl',
						options: [
							{
								name: 'The Coil',
								maxMembers: 3,
							},
							{
								name: 'Contest of Elders',
								maxMembers: 3,
							},
						],
					},
					{
						name: 'Excision',
						maxMembers: 12,
					},
					{
						name: 'Defiant Battlegrounds',
						maxMembers: 3,
					},
					{
						name: 'Terminal Overload',
						maxMembers: 6,
					},
					{
						name: 'Vex Incursion Zone',
						maxMembers: 12,
					},
					{
						name: 'Partition: Ordnance',
						maxMembers: 3,
					},
					{
						name: 'Lightfall Campaign Mission',
						maxMembers: 3,
					},
					{
						name: 'Weekly Witch Queen Campaign Mission',
						maxMembers: 3,
					},
					{
						name: 'Wellspring',
						maxMembers: 6,
					},
					{
						name: 'Dares of Eternity',
						maxMembers: 6,
					},
					{
						name: 'Wrathborn Hunt',
						maxMembers: 3,
					},
					{
						name: 'Empire Hunt',
						maxMembers: 3,
					},
				],
			},
		],
	},
	{
		name: 'Among Us',
		options: [
			{
				name: 'Vanilla',
				maxMembers: 15,
			},
			{
				name: 'Hide n Seek',
				maxMembers: 15,
			},
			{
				name: 'Modded',
				maxMembers: 15,
			},
		],
	},
];

// Activities Verification, verifies fields are proper lengths and amount of activities will actually fit in Discord
const actVerification = (currentAct: Activity, currentDepth = 0) => {
	if (currentDepth > 4) {
		log(LT.ERROR, `'${currentAct.name}' is too deep (${currentDepth} > 4)!`);
	}
	if (currentAct.name.length > 100) {
		log(LT.ERROR, `'${currentAct.name}' is too long (${currentAct.name.length} > 100)!`);
	}
	if (currentAct.options && currentAct.maxMembers) {
		log(LT.ERROR, `'${currentAct.name}' has both maxMembers and options specified (ONLY ONE ALLOWED)!`);
	}
	if (!currentAct.options && !currentAct.maxMembers) {
		log(LT.ERROR, `'${currentAct.name}' is missing both maxMembers and options specified (ONE IS NEEDED)!`);
	}
	if (currentAct.options) {
		if (currentAct.options.length > 25) {
			log(LT.ERROR, `'${currentAct.name}' has too many options (${currentAct.options.length} > 25)!`);
		}
		for (const act of currentAct.options) {
			actVerification(act, currentDepth + 1);
		}
	}
};

// Use a fake root activity to allow testing to occur simply
actVerification({
	name: 'root',
	options: Activities,
});
