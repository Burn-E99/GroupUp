import { Button } from '../types/commandTypes.ts';
import { gameSelectionButton } from './event-creation/step1-gameSelection.ts';
import { createCustomEventButton } from './event-creation/step1a-openCustomModal.ts';
import { verifyCustomEventButton } from './event-creation/step1b-verifyCustomActivity.ts';
import { finalizeEventButton } from './event-creation/step2-finalize.ts';
import { createEventButton } from './event-creation/step3-createEvent.ts';
import { joinEventButton } from './live-event/joinEvent.ts';
import { leaveEventButton } from './live-event/leaveEvent.ts';
import { alternateEventButton } from './live-event/alternateEvent.ts';
import { joinRequestButton } from './live-event/joinRequest.ts';
import { alternateRequestButton } from './live-event/alternateRequest.ts';
import { deleteEventButton } from './live-event/deleteEvent.ts';
import { deleteConfirmedButton } from './live-event/deleteConfirmed.ts';
import { editEventButton } from './live-event/editEvent.ts';
import { editDescriptionButton } from './live-event/editDescription.ts';
import { editDateTimeButton } from './live-event/editDateTime.ts';
import { applyDescriptionButton } from './live-event/applyDescription.ts';
import { applyDateTimeButton } from './live-event/applyDateTime.ts';
import { updateEventButton } from './live-event/updateEvent.ts';

export const buttons: Array<Button> = [
	gameSelectionButton,
	createCustomEventButton,
	verifyCustomEventButton,
	finalizeEventButton,
	createEventButton,
	joinEventButton,
	leaveEventButton,
	alternateEventButton,
	joinRequestButton,
	alternateRequestButton,
	deleteEventButton,
	deleteConfirmedButton,
	editEventButton,
	editDescriptionButton,
	editDateTimeButton,
	applyDescriptionButton,
	applyDateTimeButton,
	updateEventButton,
];
