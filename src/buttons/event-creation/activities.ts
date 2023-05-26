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
						name: 'Root of Nightmares',
						maxMembers: 6,
					},
					{
						name: 'King\'s Fall',
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
				name: 'Crucible',
				options: [
					{
						name: 'Crucible Labs',
						maxMembers: 6,
					},
					{
						name: 'Competitive',
						maxMembers: 3,
					},
					{
						name: 'Clash',
						maxMembers: 6,
					},
					{
						name: 'Weekly Mode',
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
						name: 'Vanguard Ops',
						maxMembers: 3,
					},
					{
						name: 'Nightfall',
						maxMembers: 3,
					},
					{
						name: 'Grandmaster Nightfall',
						maxMembers: 3,
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
				],
			},
			{
				name: 'Miscellaneous/Seasonal',
				options: [
					{
						name: 'Fishing',
						maxMembers: 3,
					},
					{
						name: 'Deep Dive',
						maxMembers: 3,
					},
					{
						name: 'Salvage',
						maxMembers: 6,
					},
					{
						name: 'Defiant Battlegrounds',
						maxMembers: 3,
					},
					{
						name: 'Terminal Overload',
						maxMembers: 12,
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
