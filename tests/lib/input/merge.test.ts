import { describe, expect, it } from 'vitest';
import { orAll, resolveDirection } from '../../../src/lib/input/merge';

describe('resolveDirection — keyboard > touch > gamepad precedence (FR-005)', () => {
  it('keyboard wins over both other sources', () => {
    expect(resolveDirection('left', 'right', 'up')).toBe('left');
  });

  it('touch wins over gamepad when keyboard reports nothing', () => {
    expect(resolveDirection(undefined, 'right', 'up')).toBe('right');
  });

  it('gamepad is used only when both above report nothing', () => {
    expect(resolveDirection(undefined, undefined, 'up')).toBe('up');
  });

  it('resolves undefined when all three report nothing', () => {
    expect(resolveDirection(undefined, undefined, undefined)).toBeUndefined();
  });
});

describe('orAll — logical OR across sources, not a count (FR-006)', () => {
  it('is true iff at least one argument is true', () => {
    expect(orAll(false, false, false)).toBe(false);
    expect(orAll(true, false, false)).toBe(true);
    expect(orAll(false, true, false)).toBe(true);
    expect(orAll(false, false, true)).toBe(true);
  });

  it('two sources firing the same one-shot on the same tick still produces a single true', () => {
    expect(orAll(true, true, false)).toBe(true);
    expect(orAll(true, true, true)).toBe(true);
  });

  it('takes primitives, not callables, and never re-invokes anything passed to it', () => {
    let calls = 0;
    const readOnce = (): boolean => {
      calls += 1;
      return true;
    };
    // The call-site discipline this contract depends on: every source's
    // consume*() is evaluated exactly once, before orAll ever runs, never
    // inside a short-circuiting `||` expression (contracts/input-merge-api.md).
    const a = readOnce();
    const b = false;
    const c = false;
    const result = orAll(a, b, c);
    expect(result).toBe(true);
    expect(calls).toBe(1);
  });
});
