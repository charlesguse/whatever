import { describe, expect, it } from 'vitest';
import { resolveAvailabilityAfterGesture, type AudioContextOutcome } from '../../../src/lib/audio/availability';

describe('resolveAvailabilityAfterGesture (US4 Independent Test)', () => {
  it.each([
    ['noConstructor', 'unavailable'],
    ['throws', 'unavailable'],
    ['staysSuspended', 'unavailable'],
    ['resumeRejects', 'unavailable'],
    ['healthy', 'available'],
  ] satisfies Array<[AudioContextOutcome, string]>)('maps %s to %s', (outcome, expected) => {
    expect(resolveAvailabilityAfterGesture(outcome)).toBe(expected);
  });
});
