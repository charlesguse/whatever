import { describe, expect, it } from 'vitest';
import { nextLastInputSource, shouldShowTouchControls, type LastInputSource } from '../../../src/lib/input/visibility';

describe('nextLastInputSource — reducer table (FR-027a)', () => {
  it("'touch' always resolves 'touch'", () => {
    expect(nextLastInputSource('none', 'touch')).toBe('touch');
    expect(nextLastInputSource('discrete', 'touch')).toBe('touch');
    expect(nextLastInputSource('touch', 'touch')).toBe('touch'); // no-op
  });

  it("'pen' always resolves 'touch'", () => {
    expect(nextLastInputSource('none', 'pen')).toBe('touch');
    expect(nextLastInputSource('discrete', 'pen')).toBe('touch');
    expect(nextLastInputSource('touch', 'pen')).toBe('touch'); // no-op
  });

  it("'keyboard' always resolves 'discrete'", () => {
    expect(nextLastInputSource('none', 'keyboard')).toBe('discrete');
    expect(nextLastInputSource('touch', 'keyboard')).toBe('discrete');
    expect(nextLastInputSource('discrete', 'keyboard')).toBe('discrete'); // no-op
  });

  it("'mouse' always resolves 'discrete'", () => {
    expect(nextLastInputSource('none', 'mouse')).toBe('discrete');
    expect(nextLastInputSource('touch', 'mouse')).toBe('discrete');
    expect(nextLastInputSource('discrete', 'mouse')).toBe('discrete'); // no-op
  });

  it("'unknown' is always a no-op, leaving `current` unchanged (FR-004)", () => {
    expect(nextLastInputSource('none', 'unknown')).toBe('none');
    expect(nextLastInputSource('touch', 'unknown')).toBe('touch');
    expect(nextLastInputSource('discrete', 'unknown')).toBe('discrete');
  });

  it('a tap-synthesized activation (touch then unknown) resolves touch, opposite a genuine mouse activation (FR-006)', () => {
    const tapSynthesized = nextLastInputSource(nextLastInputSource('none', 'touch'), 'unknown');
    const genuineMouse = nextLastInputSource('none', 'mouse');
    expect(tapSynthesized).toBe('touch');
    expect(genuineMouse).toBe('discrete');
    expect(tapSynthesized).not.toBe(genuineMouse);
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
