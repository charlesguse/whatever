import { describe, expect, it } from 'vitest';
import { nextLastInputSource, shouldShowTouchControls, type LastInputSource } from '../../../src/lib/input/visibility';

describe('nextLastInputSource — reducer table (FR-027a)', () => {
  it("'touchstart' always resolves 'touch'", () => {
    expect(nextLastInputSource('none', 'touchstart')).toBe('touch');
    expect(nextLastInputSource('discrete', 'touchstart')).toBe('touch');
    expect(nextLastInputSource('touch', 'touchstart')).toBe('touch'); // no-op
  });

  it("'keydown' always resolves 'discrete'", () => {
    expect(nextLastInputSource('none', 'keydown')).toBe('discrete');
    expect(nextLastInputSource('touch', 'keydown')).toBe('discrete');
    expect(nextLastInputSource('discrete', 'keydown')).toBe('discrete'); // no-op
  });

  it("'click' always resolves 'discrete'", () => {
    expect(nextLastInputSource('none', 'click')).toBe('discrete');
    expect(nextLastInputSource('touch', 'click')).toBe('discrete');
    expect(nextLastInputSource('discrete', 'click')).toBe('discrete'); // no-op
  });
});

describe('shouldShowTouchControls — capability x last-input table (SC-011b)', () => {
  const cases: Array<[boolean, LastInputSource, boolean]> = [
    [false, 'none', false],
    [false, 'touch', false],
    [false, 'discrete', false],
    [true, 'none', true],
    [true, 'touch', true],
    [true, 'discrete', false],
  ];

  for (const [hasTouch, lastInputSource, expected] of cases) {
    it(`hasTouch=${hasTouch}, lastInputSource=${lastInputSource} -> ${expected}`, () => {
      expect(shouldShowTouchControls({ hasTouch }, lastInputSource)).toBe(expected);
    });
  }
});
