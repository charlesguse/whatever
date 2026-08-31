import { describe, expect, it } from 'vitest';
import { cycleThemeId } from '../../../src/lib/themes/selection';

describe('cycleThemeId', () => {
  it('returns the id immediately after currentId in order', () => {
    expect(cycleThemeId('a', ['a', 'b', 'c'])).toBe('b');
    expect(cycleThemeId('b', ['a', 'b', 'c'])).toBe('c');
  });

  it('wraps to order[0] when currentId is the last entry', () => {
    expect(cycleThemeId('c', ['a', 'b', 'c'])).toBe('a');
  });

  it('wraps to order[0] when currentId is not found in order at all', () => {
    expect(cycleThemeId('missing', ['a', 'b', 'c'])).toBe('a');
  });

  it('returns currentId unchanged when order.length < 2', () => {
    expect(cycleThemeId('a', ['a'])).toBe('a');
    expect(cycleThemeId('a', [])).toBe('a');
  });
});
