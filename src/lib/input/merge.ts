import type { Direction } from '../../sim/tick';

// The one file that encodes FR-005 (direction precedence) and FR-006
// (one-shot/grab OR). Every other input-related module — keyboard, touch,
// gamepad — is unaware that the other two exist.

// FR-005: fixed precedence, never dependent on listener order.
export function resolveDirection(
  keyboard: Direction | undefined,
  touch: Direction | undefined,
  gamepad: Direction | undefined
): Direction | undefined {
  return keyboard ?? touch ?? gamepad;
}

// FR-006: callers MUST compute every argument before calling — each
// source's consume*() clears its own pending flag as a side effect, so a
// short-circuiting `||` at the call site would leak a stale flag into the
// next tick (contracts/input-merge-api.md).
export function orAll(...values: boolean[]): boolean {
  return values.some(Boolean);
}
