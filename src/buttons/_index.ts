import { Button } from '../types/commandTypes.ts';
import { createEventButton } from './event-creation/step1-gameSelection.ts';
import { createCustomEventButton } from './event-creation/step1a-openCustomModal.ts';
import { verifyCustomEventButton } from './event-creation/step1b-verifyCustomActivity.ts';

export const buttons: Array<Button> = [createEventButton, createCustomEventButton, verifyCustomEventButton];
