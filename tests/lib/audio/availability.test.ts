import { describe, expect, it } from 'vitest';
import {
  nextAvailabilityForInput,
  resolveAvailabilityAfterGesture,
  type AudioAvailability,
  type AudioContextOutcome,
  type InputSource,
} from '../../../src/lib/audio/availability';

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

describe('nextAvailabilityForInput (SC-009, FR-043 — availability state machine)', () => {
  it.each([
    ['key', 'unlocking'],
    ['click', 'unlocking'],
    ['touch', 'unlocking'],
    ['gamepad', 'notCreated'],
  ] satisfies Array<[InputSource, AudioAvailability]>)('from notCreated, %s -> %s', (source, expected) => {
    expect(nextAvailabilityForInput('notCreated', source)).toBe(expected);
  });

  it('never moves a gamepad-only session out of notCreated, no matter how many presses', () => {
    let availability: AudioAvailability = 'notCreated';
    for (let i = 0; i < 5; i++) {
      availability = nextAvailabilityForInput(availability, 'gamepad');
    }
    expect(availability).toBe('notCreated');
  });

  it.each(['unlocking', 'available', 'unavailable'] satisfies AudioAvailability[])(
    'is a no-op for every source once availability is %s',
    (current) => {
      const sources: InputSource[] = ['key', 'click', 'touch', 'gamepad'];
      for (const source of sources) {
        expect(nextAvailabilityForInput(current, source)).toBe(current);
      }
    }
  );
});
