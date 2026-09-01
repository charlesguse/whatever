import { describe, expect, it } from 'vitest';
import { applyVoiceCap, DEFAULT_VOICE_CAP, VOICE_PRIORITY_ORDER } from '../../../src/lib/audio/priority';
import type { SoundEventId } from '../../../src/lib/audio/events';

describe('VOICE_PRIORITY_ORDER (FR-020a)', () => {
  it('is the full stated order, highest first', () => {
    expect(VOICE_PRIORITY_ORDER).toEqual([
      'explosion',
      'diamondCollected',
      'doorOpen',
      'timeLow',
      'bonusTally',
      'fallStart',
      'fallLand',
      'dirtStep',
    ]);
  });
});

describe('applyVoiceCap (FR-020, FR-020b)', () => {
  it('reorders to priority regardless of input order', () => {
    const events: readonly SoundEventId[] = ['dirtStep', 'explosion', 'fallLand'];
    expect(applyVoiceCap(events, 2)).toEqual(['explosion', 'fallLand']);
  });

  it('returns the input unchanged (reordered) when cap exceeds its length', () => {
    const events: readonly SoundEventId[] = ['fallStart', 'fallLand', 'timeLow'];
    expect(applyVoiceCap(events, 10)).toEqual(['timeLow', 'fallStart', 'fallLand']);
  });

  it('returns [] for empty input', () => {
    expect(applyVoiceCap([], 6)).toEqual([]);
  });

  it('never drops a player-caused explosion/diamondCollected in favor of a fallLand/fallStart/dirtStep under an over-cap set (SC-008)', () => {
    const events: readonly SoundEventId[] = [
      'dirtStep',
      'fallStart',
      'fallLand',
      'explosion',
      'diamondCollected',
    ];
    const capped = applyVoiceCap(events, 2);
    expect(capped).toEqual(['explosion', 'diamondCollected']);
  });

  it('DEFAULT_VOICE_CAP is a positive tuning value', () => {
    expect(DEFAULT_VOICE_CAP).toBe(6);
  });
});
