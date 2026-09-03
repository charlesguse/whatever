import { describe, expect, it } from 'vitest';
import {
  advanceRepeat,
  INITIAL_REPEAT_STATE,
  REPEAT_DELAY_TICKS,
  type RepeatState,
} from '../../../src/lib/input/repeat';

// contracts/repeat-delay-api.md's literal-value table (FR-001–FR-003,
// FR-005, FR-006, SC-001, SC-003, SC-004).
describe('advanceRepeat — one-tick repeat delay (FR-001–FR-003)', () => {
  it('reports on the first tick a fresh press is observed held', () => {
    const { state, report } = advanceRepeat(INITIAL_REPEAT_STATE, true);
    expect(report).toBe(true);
    expect(state.ticksSincePress).toBe(1);
  });

  it('suppresses the second consecutive held tick', () => {
    let state: RepeatState = INITIAL_REPEAT_STATE;
    ({ state } = advanceRepeat(state, true));
    const second = advanceRepeat(state, true);
    expect(second.report).toBe(false);
    expect(second.state.ticksSincePress).toBe(2);
  });

  it('reports the third tick and every tick after, indefinitely', () => {
    let state: RepeatState = INITIAL_REPEAT_STATE;
    ({ state } = advanceRepeat(state, true)); // tick 1: report
    ({ state } = advanceRepeat(state, true)); // tick 2: suppress
    for (let tick = 3; tick <= 20; tick += 1) {
      const result = advanceRepeat(state, true);
      expect(result.report).toBe(true);
      expect(result.state.ticksSincePress).toBe(tick);
      state = result.state;
    }
  });

  it('resets to INITIAL_REPEAT_STATE and does not report on release', () => {
    let state: RepeatState = INITIAL_REPEAT_STATE;
    ({ state } = advanceRepeat(state, true));
    const released = advanceRepeat(state, false);
    expect(released.report).toBe(false);
    expect(released.state).toEqual(INITIAL_REPEAT_STATE);
  });

  it('a fresh press after release reports again on its own first tick', () => {
    let state: RepeatState = INITIAL_REPEAT_STATE;
    ({ state } = advanceRepeat(state, true));
    ({ state } = advanceRepeat(state, false));
    const rePressed = advanceRepeat(state, true);
    expect(rePressed.report).toBe(true);
    expect(rePressed.state.ticksSincePress).toBe(1);
  });

  it('is total and pure: not-held from an already-initial state stays initial, not reported', () => {
    const result = advanceRepeat(INITIAL_REPEAT_STATE, false);
    expect(result.report).toBe(false);
    expect(result.state).toEqual(INITIAL_REPEAT_STATE);
  });

  it('REPEAT_DELAY_TICKS is fixed at 1 (FR-003)', () => {
    expect(REPEAT_DELAY_TICKS).toBe(1);
  });
});
