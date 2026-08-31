import { describe, expect, it } from 'vitest';
import { cycleThemeId, resolveStoredThemeId } from '../../../src/lib/themes/selection';

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

describe('resolveStoredThemeId (FR-025)', () => {
  const registeredIds = ['classroom', 'classic'];

  it('returns a registered id unchanged', () => {
    expect(resolveStoredThemeId('classic', registeredIds, 'classroom')).toBe('classic');
  });

  it('resolves an unregistered id to fallbackId', () => {
    expect(resolveStoredThemeId('nonexistent', registeredIds, 'classroom')).toBe('classroom');
  });

  it('resolves a non-string value to fallbackId', () => {
    expect(resolveStoredThemeId(5, registeredIds, 'classroom')).toBe('classroom');
    expect(resolveStoredThemeId({ id: 'classic' }, registeredIds, 'classroom')).toBe('classroom');
    expect(resolveStoredThemeId(null, registeredIds, 'classroom')).toBe('classroom');
  });

  it('resolves undefined to fallbackId', () => {
    expect(resolveStoredThemeId(undefined, registeredIds, 'classroom')).toBe('classroom');
  });
});
