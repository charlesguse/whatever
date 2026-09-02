import { describe, expect, it } from 'vitest';
import { resolveStoredMute, toggleMute } from '../../../src/lib/audio/mute';

describe('resolveStoredMute (FR-032)', () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
    [null, false],
    ['true', false],
    [1, false],
  ])('resolves %j to %j', (stored, expected) => {
    expect(resolveStoredMute(stored)).toBe(expected);
  });
});

describe('toggleMute', () => {
  it('N toggles land on the parity of N', () => {
    let muted = false;
    for (let n = 1; n <= 5; n++) {
      muted = toggleMute(muted);
      expect(muted).toBe(n % 2 === 1);
    }
  });
});
