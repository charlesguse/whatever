import { describe, expect, it } from 'vitest';
import { resolveDominantAxis } from '../../../../src/lib/input/touch/axis';

describe('resolveDominantAxis — larger-magnitude axis wins (FR-010, FR-020)', () => {
  it('picks horizontal when |dx| > |dy|, sign picking the direction', () => {
    expect(resolveDominantAxis(10, 1)).toBe('right');
    expect(resolveDominantAxis(-10, 1)).toBe('left');
    expect(resolveDominantAxis(10, -1)).toBe('right');
    expect(resolveDominantAxis(-10, -1)).toBe('left');
  });

  it('picks vertical when |dy| > |dx|, sign picking the direction', () => {
    expect(resolveDominantAxis(1, 10)).toBe('down');
    expect(resolveDominantAxis(1, -10)).toBe('up');
    expect(resolveDominantAxis(-1, 10)).toBe('down');
    expect(resolveDominantAxis(-1, -10)).toBe('up');
  });
});

describe('resolveDominantAxis — exact tie (|dx| === |dy|, both non-zero)', () => {
  it('with no tieBreakDirection, always resolves horizontal regardless of signs', () => {
    expect(resolveDominantAxis(5, 5)).toBe('right');
    expect(resolveDominantAxis(-5, 5)).toBe('left');
    expect(resolveDominantAxis(5, -5)).toBe('right');
    expect(resolveDominantAxis(-5, -5)).toBe('left');
  });

  it('with a tieBreakDirection matching one of the two tied directions, returns it', () => {
    // dx=5,dy=5 -> tied pair is 'right'/'down'
    expect(resolveDominantAxis(5, 5, 'right')).toBe('right');
    expect(resolveDominantAxis(5, 5, 'down')).toBe('down');
    // dx=-5,dy=5 -> tied pair is 'left'/'down'
    expect(resolveDominantAxis(-5, 5, 'left')).toBe('left');
    expect(resolveDominantAxis(-5, 5, 'down')).toBe('down');
    // dx=5,dy=-5 -> tied pair is 'right'/'up'
    expect(resolveDominantAxis(5, -5, 'right')).toBe('right');
    expect(resolveDominantAxis(5, -5, 'up')).toBe('up');
    // dx=-5,dy=-5 -> tied pair is 'left'/'up'
    expect(resolveDominantAxis(-5, -5, 'left')).toBe('left');
    expect(resolveDominantAxis(-5, -5, 'up')).toBe('up');
  });

  it('with a tieBreakDirection not one of the tied pair, falls through to horizontal', () => {
    // dx=5,dy=5 -> tied pair is 'right'/'down'; 'left' and 'up' are neither
    expect(resolveDominantAxis(5, 5, 'left')).toBe('right');
    expect(resolveDominantAxis(5, 5, 'up')).toBe('right');
    // dx=-5,dy=-5 -> tied pair is 'left'/'up'; 'right' and 'down' are neither
    expect(resolveDominantAxis(-5, -5, 'right')).toBe('left');
    expect(resolveDominantAxis(-5, -5, 'down')).toBe('left');
  });
});
