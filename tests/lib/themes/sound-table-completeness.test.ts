import { describe, expect, it } from 'vitest';
import type { SoundEventId } from '../../../src/lib/audio/events';
import { TICK_RATE_HZ } from '../../../src/sim/cave';
import { listThemes } from '../../../src/lib/themes/registry';
import type { Theme, VoiceSpec } from '../../../src/lib/themes/types';
import '../../../src/lib/themes';

// FR-021: a voice MUST be over before it can mask the next event of the
// same id at the game's tick rate. doorOpen is exempt — FR-007 guarantees
// it fires at most once per cave attempt, so same-id masking cannot occur.
const TICK_INTERVAL_MS = 1000 / TICK_RATE_HZ;
const MASKING_EXEMPT_EVENT_IDS: ReadonlySet<SoundEventId> = new Set(['doorOpen']);

const SOUND_EVENT_IDS: readonly SoundEventId[] = [
  'dirtStep',
  'fallStart',
  'fallLand',
  'diamondCollected',
  'doorOpen',
  'explosion',
  'timeLow',
  'bonusTally',
];

// FR-039: switching theme is never an audible volume jump — every voice's
// level, in every registered theme, falls inside this one shared band.
const SHARED_LEVEL_BAND: readonly [number, number] = [0.2, 0.6];

// FR-029 (mirrored for sound), SC-008: fails naming both the theme's id and
// the specific missing event id — never a bare boolean.
function checkSoundTableCompleteness(theme: Theme, eventIds: readonly SoundEventId[] = SOUND_EVENT_IDS): void {
  for (const id of eventIds) {
    if (!(id in theme.sounds)) {
      throw new Error(`Theme "${theme.id}" is missing a sound entry for event id "${id}"`);
    }
  }
}

function checkVoiceSpecRanges(theme: Theme): void {
  for (const id of SOUND_EVENT_IDS) {
    const voice: VoiceSpec = theme.sounds[id];
    const label = `Theme "${theme.id}" sound "${id}"`;

    expect(voice.frequencyHz, `${label} frequencyHz`).toBeGreaterThanOrEqual(20);
    expect(voice.frequencyHz, `${label} frequencyHz`).toBeLessThanOrEqual(20000);
    if (voice.frequencyEndHz !== undefined) {
      expect(voice.frequencyEndHz, `${label} frequencyEndHz`).toBeGreaterThanOrEqual(20);
      expect(voice.frequencyEndHz, `${label} frequencyEndHz`).toBeLessThanOrEqual(20000);
    }

    expect(voice.durationMs, `${label} durationMs`).toBeGreaterThan(0);
    expect(voice.durationMs, `${label} durationMs`).toBeLessThanOrEqual(2000);

    expect(voice.attackMs, `${label} attackMs`).toBeGreaterThanOrEqual(0);
    expect(voice.releaseMs, `${label} releaseMs`).toBeGreaterThanOrEqual(0);
    expect(voice.attackMs + voice.releaseMs, `${label} attackMs + releaseMs`).toBeLessThanOrEqual(voice.durationMs);

    expect(voice.level, `${label} level`).toBeGreaterThanOrEqual(0);
    expect(voice.level, `${label} level`).toBeLessThanOrEqual(1);
    expect(voice.level, `${label} level (shared band, FR-039)`).toBeGreaterThanOrEqual(SHARED_LEVEL_BAND[0]);
    expect(voice.level, `${label} level (shared band, FR-039)`).toBeLessThanOrEqual(SHARED_LEVEL_BAND[1]);

    expect(voice.noiseMix, `${label} noiseMix`).toBeGreaterThanOrEqual(0);
    expect(voice.noiseMix, `${label} noiseMix`).toBeLessThanOrEqual(1);

    if (!MASKING_EXEMPT_EVENT_IDS.has(id)) {
      expect(voice.durationMs, `${label} durationMs (FR-021, masking)`).toBeLessThan(TICK_INTERVAL_MS);
    }
  }
}

describe('registered theme sound-table completeness (FR-034, FR-035, SC-002)', () => {
  it.each(listThemes())('theme "$id" defines a voice for every sound event id', (theme) => {
    expect(() => checkSoundTableCompleteness(theme)).not.toThrow();
  });

  it.each(listThemes())('theme "$id" — every voice field is within its declared range', (theme) => {
    checkVoiceSpecRanges(theme);
  });
});

describe('the completeness check fails loudly on a deliberately incomplete fixture', () => {
  it('names both the fixture id and the missing event id', () => {
    const complete = listThemes()[0];
    const { explosion: _omitted, ...incompleteSounds } = complete.sounds;
    const incompleteFixture: Theme = {
      ...complete,
      id: 'incomplete-fixture',
      sounds: incompleteSounds as Theme['sounds'],
    };

    expect(() => checkSoundTableCompleteness(incompleteFixture)).toThrow(/incomplete-fixture/);
    expect(() => checkSoundTableCompleteness(incompleteFixture)).toThrow(/explosion/);
  });
});

describe('the completeness check fails for every registered theme when a new event id has no themed entry', () => {
  it('fails for every shipped theme against an event-id list with one extra id', () => {
    const eventIdsWithExtra = [...SOUND_EVENT_IDS, 'unthemedFutureEvent'] as unknown as readonly SoundEventId[];
    for (const theme of listThemes()) {
      expect(() => checkSoundTableCompleteness(theme, eventIdsWithExtra)).toThrow(
        new RegExp(`${theme.id}.*unthemedFutureEvent`)
      );
    }
  });
});

describe('Classroom and Classic differ per event id (FR-039)', () => {
  it('every SoundEventId has a distinct VoiceSpec between the two shipped themes', () => {
    const themes = listThemes();
    const classroom = themes.find((t) => t.id === 'classroom');
    const classic = themes.find((t) => t.id === 'classic');
    expect(classroom).toBeDefined();
    expect(classic).toBeDefined();
    if (!classroom || !classic) return;

    for (const id of SOUND_EVENT_IDS) {
      expect(classroom.sounds[id], `sound "${id}"`).not.toEqual(classic.sounds[id]);
    }
  });
});
