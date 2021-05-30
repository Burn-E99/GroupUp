import {
	ActionRow, ButtonComponent, DiscordButtonStyles, EmbedField, DiscordenoMember
} from "../deps.ts";

import { JoinLeaveType } from "./lfgHandlers.d.ts";
import { BuildingLFG } from "./mod.d.ts";
import { LFGActivities } from "./games.ts";
import { determineTZ } from "./timeUtils.ts"

export const handleLFGStep = async (wipLFG: BuildingLFG, input: string): Promise<BuildingLFG> => {
	const currentLFG = (wipLFG.lfgMsg.embeds[0] || { fields: undefined }).fields || [
		{
			name: ". . .",
			value: ". . .",
			inline: true
		},
		{
			name: "Start Time:",
			value: ". . .",
			inline: true
		},
		{
			name: "Add to Calendar:",
			value: "Coming Soon:tm:",
			inline: true
		},
		{
			name: "Description:",
			value: ". . .",
			inline: false
		},
		{
			name: `Members Joined: 0/?`,
			value: "None",
			inline: true
		},
		{
			name: "Alternates:",
			value: "None",
			inline: true
		}
	];

	let nextQuestion = "";
	const nextComponents: Array<ActionRow> = [];
	let editFlag = true;

	switch (wipLFG.step) {
		case "set_game": {
			currentLFG[0].name = input;

			if (Object.prototype.hasOwnProperty.call(LFGActivities, input)) {
				nextQuestion = "Please select an Activity from the list below.  Depending on the game selected, these may be categories you can use to drill down to a specific activity.\n\nIf your activity is not listed, please type it out:";

				let tempObj = {};
				Object.entries(LFGActivities).some(e => {
					if (e[0] === input) {
						tempObj = e[1];
						return true;
					}
				});

				const activityButtons: Array<ButtonComponent> = Object.keys(tempObj).map(activity => {
					return {
						type: 2,
						label: activity,
						customId: `building@set_activity#${activity}`,
						style: DiscordButtonStyles.Primary
					};
				});

				const temp: Array<ActionRow["components"]> = [];

				activityButtons.forEach((btn, idx) => {
					if (!temp[Math.floor(idx/5)]) {
						temp[Math.floor(idx/5)] = [btn];
					} else {
						temp[Math.floor(idx/5)].push(btn);
					}
				});

				temp.forEach(btns => {
					if (btns.length && btns.length <= 5) {
						nextComponents.push({
							type: 1,
							components: btns
						});
					}
				});
			} else {
				nextQuestion = "Please type the activity name out:";
			}

			wipLFG.step = "set_activity";
			break;
		}
		case "set_activity": {
			const game = currentLFG[0].name;

			let tempObj;
			Object.entries(LFGActivities).some(e => {
				if (e[0] === game) {
					Object.entries(e[1]).some(f => {
						if (f[0] === input) {
							tempObj = f[1];
							return true;
						}
					});
					return true;
				}
			});

			currentLFG[0].name = `${game}:`;
			currentLFG[0].value = input;

			if (typeof tempObj === "number") {
				// Activity
				currentLFG[4].name = `Members Joined: ${currentLFG[4].value === "None" ? 0 : currentLFG[4].value.split("\n").length}/${tempObj}`;

				nextQuestion = wipLFG.editing ? "Finalizing, please wait. . ." : "Please enter the time of the activity:";

				wipLFG.step = wipLFG.editing ? "done" : "set_time";
			} else if (!tempObj) {
				// Custom
				nextQuestion = "Please enter the max number of members for this activity:";

				wipLFG.step = "set_player_cnt";
			} else {
				// Category
				nextQuestion = "Please select an Activity from the list below.\n\nIf your activity is not listed, please type it out:";

				currentLFG[0].name = game;
				
				const activityButtons: Array<ButtonComponent> = Object.keys(tempObj).map(activity => {
					return {
						type: 2,
						label: activity,
						customId: `building@set_activity_from_category#${activity}`,
						style: DiscordButtonStyles.Primary
					};
				});

				const temp: Array<ActionRow["components"]> = [];

				activityButtons.forEach((btn, idx) => {
					if (!temp[Math.floor(idx/5)]) {
						temp[Math.floor(idx/5)] = [btn];
					} else {
						temp[Math.floor(idx/5)].push(btn);
					}
				});

				temp.forEach(btns => {
					if (btns.length && btns.length <= 5) {
						nextComponents.push({
							type: 1,
							components: btns
						});
					}
				});

				wipLFG.step = "set_activity_from_category";
			}

			break;
		}
		case "set_activity_from_category": {
			const game = currentLFG[0].name;
			const category = currentLFG[0].value;

			let tempObj;
			Object.entries(LFGActivities).some(e => {
				if (e[0] === game) {
					Object.entries(e[1]).some(f => {
						if (f[0] === category) {
							Object.entries(f[1]).some(g => {
								if (g[0] === input) {
									tempObj = g[1];
									return true;
								}
							});
							return true;
						}
					});
					return true;
				}
			});

			currentLFG[0].name = `${game}:`;
			currentLFG[0].value = input;

			if (tempObj) {
				currentLFG[4].name = `Members Joined: ${currentLFG[4].value === "None" ? 0 : currentLFG[4].value.split("\n").length}/${tempObj}`;
				
				nextQuestion =  wipLFG.editing ? "Finalizing, please wait. . ." : "Please enter the time of the activity:";
	
				wipLFG.step = wipLFG.editing ? "done" : "set_time";
			} else {
				nextQuestion =  "Please enter the max number of members for this activity:";

				wipLFG.step = "set_player_cnt";
			}
			break;
		}
		case "set_player_cnt": {
			if (parseInt(input)) {
				currentLFG[4].name = `Members Joined: ${currentLFG[4].value === "None" ? 0 : currentLFG[4].value.split("\n").length}/${parseInt(input)}`;

				nextQuestion = wipLFG.editing ? "Finalizing, please wait. . ." : "Please enter the time of the activity:";

				wipLFG.step = wipLFG.editing ? "done" : "set_time";
			} else {
				editFlag = false;

				nextQuestion = `Input max members "${input}" is invalid, please make sure you are only entering a number.\n\nPlease enter the max number of members for this activity:`
			}
			break;
		}
		case "set_time": {
			const today = new Date();

			let lfgDate = `${today.getMonth() + 1}/${today.getDate()}`,
				lfgTime = "",
				lfgTZ = "",
				lfgPeriod = "";
			
			input.split(" ").forEach(c => {
				if (c.includes("/")) {
					lfgDate = c;
				} else if (c.includes(":") || parseInt(c).toString() === c) {
					lfgTime = c;
				} else if (c.toLowerCase() === "am" || c.toLowerCase() === "pm") {
					lfgPeriod = c.toLowerCase();
				} else if (c.toLowerCase().includes("am") || c.toLowerCase().includes("pm")) {
					lfgTime = c.substr(0, c.length - 2);
					lfgPeriod = c.toLowerCase().includes("am") ? "am" : "pm";
				} else {
					lfgTZ = determineTZ(c);
				}
			});

			if (!lfgTZ) {
				lfgTZ = determineTZ("ET");
			}

			if (!lfgTime.includes(":")) {
				lfgTime += ":00";
			}

			if (!lfgPeriod) {
				lfgPeriod = parseInt(lfgTime.split(":")[0]) >= 12 ? "pm" : "am";
			}
			lfgPeriod = lfgPeriod.toUpperCase();
			lfgTZ = lfgTZ.toUpperCase();

			lfgDate = `${lfgDate.split("/")[0]}/${lfgDate.split("/")[1]}/${today.getFullYear()}`;
			const lfgDateTime = new Date(`${lfgTime} ${lfgPeriod} ${lfgTZ} ${lfgDate}`);

			lfgDate = `${lfgDate.split("/")[0]}/${lfgDate.split("/")[1]}`;
			const lfgDateStr = `[${lfgTime} ${lfgPeriod} ${lfgTZ} ${lfgDate}](https://groupup.eanm.dev/tz#${lfgDateTime.getTime()})`;

			currentLFG[1].name = "Start Time (Click for Conversion):";
			currentLFG[1].value = lfgDateStr;

			if (isNaN(lfgDateTime.getTime())) {
				nextQuestion = `Input time "${input}" is invalid, please make sure you have the timezone set correctly.\n\nPlease enter the time of the activity:`;

				editFlag = false;
			} else {
				nextQuestion = wipLFG.editing ? "Finalizing, please wait. . ." : "Please enter a description for the activity.  Enter `none` to skip:";

				wipLFG.step = wipLFG.editing ? "done" : "set_desc";
			}
			break;
		}
		case "set_desc":{
			if (input === "none") {
				input = currentLFG[0].value;
			}

			currentLFG[3].value = input;

			nextQuestion =  "Finalizing, please wait. . .";

			wipLFG.step = "done";
			break;
		}
		default:
			break;
	}

	if (editFlag) {
		wipLFG.lfgMsg = await wipLFG.lfgMsg.edit({
			embed: {
				fields: currentLFG
			}
		});
	}

	wipLFG.questionMsg = await wipLFG.questionMsg.edit({
		content: nextQuestion,
		components: nextComponents
	});

	return wipLFG;
};

export const handleMemberJoin = (lfg: EmbedField[], member: DiscordenoMember, alternate: boolean): JoinLeaveType => {
	let success = false;
	
	const userStr = `${member.username} - <@${member.id}>`;
	
	const tempMembers = lfg[4].name.split(":")[1].split("/");
	let currentMembers = parseInt(tempMembers[0]);
	const maxMembers = parseInt(tempMembers[1]);

	if (alternate && !lfg[5].value.includes(member.id.toString())) {
		if (lfg[4].value.includes(member.id.toString())) {
			const tempArr = lfg[4].value.split("\n");
			const memberIdx = tempArr.findIndex(m => m.includes(member.id.toString()));
			tempArr.splice(memberIdx, 1)
			lfg[4].value = tempArr.join("\n") || "None";

			if (currentMembers) {
				currentMembers--;
			}
			lfg[4].name = `Members Joined: ${currentMembers}/${maxMembers}`;
		}

		if (lfg[5].value === "None") {
			lfg[5].value = userStr;
		} else {
			lfg[5].value += `\n${userStr}`;
		}

		success = true;
	} else if (!alternate &&currentMembers < maxMembers && !lfg[4].value.includes(member.id.toString())) {
		if (lfg[5].value.includes(member.id.toString())) {
			const tempArr = lfg[5].value.split("\n");
			const memberIdx = tempArr.findIndex(m => m.includes(member.id.toString()));
			tempArr.splice(memberIdx, 1)
			lfg[5].value = tempArr.join("\n") || "None";
		}

		if (lfg[4].value === "None") {
			lfg[4].value = userStr;
		} else {
			lfg[4].value += `\n${userStr}`;
		}
		currentMembers++;

		lfg[4].name = `Members Joined: ${currentMembers}/${maxMembers}`;

		success = true;
	}

	return {
		embed: lfg,
		success: success,
		full: currentMembers === maxMembers
	};
};

export const handleMemberLeave = (lfg: EmbedField[], member: DiscordenoMember): JoinLeaveType => {
	let success = false;

	const memberId = member.id.toString();

	const tempMembers = lfg[4].name.split(":")[1].split("/");
	let currentMembers = parseInt(tempMembers[0]);
	const maxMembers = parseInt(tempMembers[1]);

	if (lfg[4].value.includes(memberId)) {
		const tempArr = lfg[4].value.split("\n");
		const memberIdx = tempArr.findIndex(m => m.includes(memberId));
		tempArr.splice(memberIdx, 1);
		lfg[4].value = tempArr.join("\n") || "None";

		if (currentMembers) {
			currentMembers--;
		}
		lfg[4].name = `Members Joined: ${currentMembers}/${maxMembers}`;

		success = true;
	}

	if (lfg[5].value.includes(memberId)) {
		const tempArr = lfg[5].value.split("\n");
		const memberIdx = tempArr.findIndex(m => m.includes(memberId));
		tempArr.splice(memberIdx, 1);
		lfg[5].value = tempArr.join("\n") || "None";

		success = true;
	}

	return {
		embed: lfg,
		success: success,
		full: currentMembers === maxMembers
	};
};
