export type LFGActivity = {
	name: string;
	maxMembers?: number;
	options?: Array<LFGActivity>;
};

export const LFGActivities: Array<LFGActivity> = [
	{
		name: 'Destiny 2',
		options: [
			{
				name: 'Raids',
				options: [
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
						name: 'Team Quickplay',
						maxMembers: 6,
					},
					{
						name: 'Competitive',
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
						name: 'Operation: Seraph\'s Shield',
						maxMembers: 3,
					},
				],
			},
			{
				name: 'Miscellaneous',
				options: [
					{
						name: 'Heist Battlegrounds',
						maxMembers: 3,
					},
					{
						name: 'Ketchrash',
						maxMembers: 6,
					},
					{
						name: 'Expedition',
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
				name: 'Modded',
				maxMembers: 15,
			},
		],
	},
];
