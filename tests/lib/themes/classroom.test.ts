import { describe, expect, it } from 'vitest';
import { ELEMENT_IDS } from '../../../src/sim/elements';
import { classroomTheme } from '../../../src/lib/themes/classroom';

// FR-025, FR-026: every declared element id — including the 9 with no sim
// behavior yet — must have a ThemeEntry in every registered theme.
describe('classroom theme completeness', () => {
  it.each(ELEMENT_IDS)('has a ThemeEntry for element id "%s"', (id) => {
    const entry = classroomTheme.elements[id];
    expect(entry).toBeDefined();
    expect(typeof entry.fillColor).toBe('string');
    expect(entry.fillColor.length).toBeGreaterThan(0);
    expect(typeof entry.glyph).toBe('string');
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
  });

  it('covers exactly the declared element set, nothing more or less', () => {
    const themeKeys = Object.keys(classroomTheme.elements).sort();
    const declaredIds = [...ELEMENT_IDS].sort();
    expect(themeKeys).toEqual(declaredIds);
  });
});
