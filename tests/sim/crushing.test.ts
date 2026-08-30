import { describe, expect, it } from 'vitest';
import { getStatus } from '../../src/sim/cave';
import { caveFromLines, runTicks } from './helpers/ascii-cave';

describe('crushing (FR-010–FR-011)', () => {
  it('a falling boulder kills the kid', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S...S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 2);
    expect(getStatus(next)).toBe('dead');
  });

  it('a falling diamond kills the kid too', () => {
    const state = caveFromLines(`
      SSSSS
      S.*.S
      S...S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 2);
    expect(getStatus(next)).toBe('dead');
  });

  it('a resting body directly above the kid never kills them, regardless of tick count', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S.P.S
      SSSSS
    `);
    const next = runTicks(state, 25);
    expect(getStatus(next)).toBe('inPlay');
  });
});
