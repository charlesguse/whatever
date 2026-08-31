import type { Direction } from '../../../sim/tick';
import { resolveDominantAxis } from '../touch/axis';
import { DPAD_BUTTON_INDEX, STICK_ENGAGE_THRESHOLD, STICK_RELEASE_THRESHOLD } from './bindings';

const DPAD_DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

// The first of up/down/left/right whose bound index is .pressed; never
// throws against a buttons array shorter than the highest bound index —
// treated as not-pressed (FR-018's best-effort clause).
export function resolveDpadDirection(buttons: readonly GamepadButton[]): Direction | undefined {
  for (const direction of DPAD_DIRECTIONS) {
    if (buttons[DPAD_BUTTON_INDEX[direction]]?.pressed) return direction;
  }
  return undefined;
}

// Deadzone with hysteresis (FR-019, SC-004): below release -> undefined
// even if previously engaged; in the band -> holds previous (never engages
// purely from the band); at/above engage -> resolveDominantAxis(x, y,
// previous).
export function resolveStickDirection(x: number, y: number, previous: Direction | undefined): Direction | undefined {
  const magnitude = Math.hypot(x, y);
  if (magnitude < STICK_RELEASE_THRESHOLD) return undefined;
  if (magnitude >= STICK_ENGAGE_THRESHOLD) return resolveDominantAxis(x, y, previous);
  return previous;
}

// FR-021: the d-pad wins whenever both report.
export function resolveDirection(dpad: Direction | undefined, stick: Direction | undefined): Direction | undefined {
  return dpad ?? stick;
}

// FR-023: edge-triggered — an index's edges contains it iff .pressed now
// and not in previousPressed, applied identically to every tracked index
// (restart/pause/cycle-theme/confirm).
export function mapOneShotButtons(
  buttons: readonly GamepadButton[],
  previousPressed: ReadonlySet<number>
): { pressedNow: ReadonlySet<number>; edges: ReadonlySet<number> } {
  const pressedNow = new Set<number>();
  const edges = new Set<number>();
  buttons.forEach((button, index) => {
    if (!button?.pressed) return;
    pressedNow.add(index);
    if (!previousPressed.has(index)) edges.add(index);
  });
  return { pressedNow, edges };
}
