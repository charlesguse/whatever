import type { Direction } from '../../../sim/tick';

// The W3C Gamepad API "standard" mapping's own published layout (FR-018).
// Reassigning any one constant at review is a one-line edit, no call-site
// change.
export const DPAD_BUTTON_INDEX: Readonly<Record<Direction, number>> = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
};
export const FACE_BUTTON_GRAB_CONFIRM_INDEX = 0;
export const PAUSE_BUTTON_INDEX = 9; // Start
export const RESTART_BUTTON_INDEX = 8; // Back / Select
export const CYCLE_THEME_BUTTON_INDEX = 5; // right shoulder/bumper — flagged, see research.md
export const MUTE_BUTTON_INDEX = 4; // left shoulder/bumper — flagged, see research.md
export const STICK_X_AXIS_INDEX = 0;
export const STICK_Y_AXIS_INDEX = 1;
export const STICK_ENGAGE_THRESHOLD = 0.5; // FR-019
export const STICK_RELEASE_THRESHOLD = 0.35; // FR-019
