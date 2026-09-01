import { describe, expect, it } from 'vitest';
import {
  mapOneShotButtons,
  resolveDirection,
  resolveDpadDirection,
  resolveStickDirection,
} from '../../../../src/lib/input/gamepad/mapping';
import { DPAD_BUTTON_INDEX } from '../../../../src/lib/input/gamepad/bindings';

function button(pressed: boolean): GamepadButton {
  return { pressed, touched: pressed, value: pressed ? 1 : 0 } as GamepadButton;
}

function buttonsWithPressed(...indices: number[]): GamepadButton[] {
  const max = Math.max(0, ...indices, 15);
  const buttons: GamepadButton[] = [];
  for (let i = 0; i <= max; i++) buttons.push(button(indices.includes(i)));
  return buttons;
}

describe('resolveDpadDirection', () => {
  it('returns the first of up/down/left/right whose bound index is pressed', () => {
    expect(resolveDpadDirection(buttonsWithPressed(DPAD_BUTTON_INDEX.up))).toBe('up');
    expect(resolveDpadDirection(buttonsWithPressed(DPAD_BUTTON_INDEX.down))).toBe('down');
    expect(resolveDpadDirection(buttonsWithPressed(DPAD_BUTTON_INDEX.left))).toBe('left');
    expect(resolveDpadDirection(buttonsWithPressed(DPAD_BUTTON_INDEX.right))).toBe('right');
  });

  it('returns undefined when nothing is pressed', () => {
    expect(resolveDpadDirection(buttonsWithPressed())).toBeUndefined();
  });

  it('never throws against a buttons array shorter than the highest bound index', () => {
    expect(() => resolveDpadDirection([button(true)])).not.toThrow();
    expect(resolveDpadDirection([button(true)])).toBeUndefined();
  });
});

describe('resolveStickDirection — deadzone with hysteresis (FR-019, SC-004, SC-005)', () => {
  it('below release resolves undefined even if previous was engaged', () => {
    expect(resolveStickDirection(0.1, 0, 'up')).toBeUndefined();
  });

  it('in the band with a previous holds previous', () => {
    expect(resolveStickDirection(0.4, 0, 'up')).toBe('up');
  });

  it('in the band with no previous never engages purely from the band', () => {
    expect(resolveStickDirection(0.4, 0, undefined)).toBeUndefined();
  });

  it('at/above engage resolves via resolveDominantAxis(x, y, previous)', () => {
    expect(resolveStickDirection(0.6, 0, undefined)).toBe('right');
    expect(resolveStickDirection(-0.6, 0, undefined)).toBe('left');
    expect(resolveStickDirection(0, 0.6, undefined)).toBe('down');
    expect(resolveStickDirection(0, -0.6, undefined)).toBe('up');
  });

  it('exact-diagonal-at-engage: holds previous when previous is one of the tied pair', () => {
    // x > 0, y < 0 -> tied pair is 'right'/'up' (resolveDominantAxis's
    // convention: dy >= 0 is 'down', matching touch's screen coordinates).
    const x = Math.SQRT1_2 * 0.6;
    const y = -Math.SQRT1_2 * 0.6;
    expect(resolveStickDirection(x, y, 'up')).toBe('up');
    expect(resolveStickDirection(x, y, 'right')).toBe('right');
  });

  it('exact-diagonal-at-engage: falls through to horizontal with no previous', () => {
    const x = Math.SQRT1_2 * 0.6;
    const y = Math.SQRT1_2 * 0.6;
    expect(resolveStickDirection(x, y, undefined)).toBe('right');
  });
});

describe('resolveDirection (FR-021 — d-pad wins)', () => {
  it('uses the d-pad direction whenever it reports one', () => {
    expect(resolveDirection('up', 'down')).toBe('up');
  });

  it('falls back to the stick only when the d-pad reports nothing', () => {
    expect(resolveDirection(undefined, 'down')).toBe('down');
    expect(resolveDirection(undefined, undefined)).toBeUndefined();
  });
});

describe('mapOneShotButtons (FR-023 — edge-triggered)', () => {
  it('fires an edge exactly once on the poll it first becomes pressed, not again while held', () => {
    let previous = new Set<number>();
    const poll1 = mapOneShotButtons(buttonsWithPressed(9), previous);
    expect(poll1.edges.has(9)).toBe(true);
    previous = poll1.pressedNow;

    const poll2 = mapOneShotButtons(buttonsWithPressed(9), previous);
    expect(poll2.edges.has(9)).toBe(false);
    expect(poll2.pressedNow.has(9)).toBe(true);
  });

  it('fires again after a release-then-repress', () => {
    let previous = new Set<number>();
    const held = mapOneShotButtons(buttonsWithPressed(9), previous);
    previous = held.pressedNow;

    const released = mapOneShotButtons(buttonsWithPressed(), previous);
    expect(released.edges.has(9)).toBe(false);
    expect(released.pressedNow.has(9)).toBe(false);
    previous = released.pressedNow;

    const repressed = mapOneShotButtons(buttonsWithPressed(9), previous);
    expect(repressed.edges.has(9)).toBe(true);
  });

  it('tracks multiple indices independently', () => {
    const poll = mapOneShotButtons(buttonsWithPressed(8, 9), new Set());
    expect(poll.edges.has(8)).toBe(true);
    expect(poll.edges.has(9)).toBe(true);
    expect(poll.pressedNow.size).toBe(2);
  });
});
