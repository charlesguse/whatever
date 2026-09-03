// FR-018: the one shared, named, separately testable repeat-delay rule.
// All three input sources import and call this; none reimplements it.
// FR-017: total, pure — no wall-clock read, no timer, no I/O, no randomness.

// FR-003: expressed as a tick count, never milliseconds, so a future tick
// rate change does not silently change the delay's meaning.
export const REPEAT_DELAY_TICKS = 1;

// `ticksSincePress === 0` iff the control is not currently tracked as held.
export interface RepeatState {
  readonly ticksSincePress: number;
}

export const INITIAL_REPEAT_STATE: RepeatState = { ticksSincePress: 0 };

// contracts/repeat-delay-api.md's table. Callers decide what "held" means
// for their control and are responsible for resetting to
// INITIAL_REPEAT_STATE on release or on a different direction taking over
// (advanceRepeat only ever sees a boolean, not "which" direction).
export function advanceRepeat(
  state: RepeatState,
  isHeldThisTick: boolean
): { state: RepeatState; report: boolean } {
  if (!isHeldThisTick) {
    return { state: INITIAL_REPEAT_STATE, report: false };
  }
  const ticksSincePress = state.ticksSincePress + 1;
  const report = ticksSincePress === 1 || ticksSincePress > REPEAT_DELAY_TICKS + 1;
  return { state: { ticksSincePress }, report };
}
