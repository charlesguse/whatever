import { describe, expect, it } from 'vitest';
import { getTheme, hasTheme, listThemes, registerTheme } from '../../../src/lib/themes/registry';
import type { Theme } from '../../../src/lib/themes/types';
import '../../../src/lib/themes';

// FR-001, FR-004, FR-005, FR-006: the real registry, exercised through the
// real registration side effect (importing '../../../src/lib/themes'), not
// a hand-built fixture registry.
describe('theme registry (FR-001, FR-004, FR-005, FR-006)', () => {
  it('listThemes() enumerates every registered theme, in registration order, classroom first', () => {
    const ids = listThemes().map((theme) => theme.id);
    expect(ids).toEqual(['classroom', 'classic']);
  });

  it('hasTheme() returns true for a registered id, false for an unregistered one, without throwing', () => {
    expect(hasTheme('classroom')).toBe(true);
    expect(hasTheme('classic')).toBe(true);
    expect(() => hasTheme('does-not-exist')).not.toThrow();
    expect(hasTheme('does-not-exist')).toBe(false);
  });

  it('registering a second theme under an id already in the registry throws, naming that id', () => {
    const duplicate: Theme = { ...getTheme('classroom'), id: 'classroom' };
    expect(() => registerTheme(duplicate)).toThrow(/classroom/);
  });
});
