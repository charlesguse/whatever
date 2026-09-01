import type { SoundEventId } from './events';

// Highest first (FR-020a) — total, fixed order; no arrival-order or
// scheduling-time tie-break anywhere (research.md).
export const VOICE_PRIORITY_ORDER: readonly SoundEventId[] = [
  'explosion',
  'diamondCollected',
  'doorOpen',
  'timeLow',
  'bonusTally',
  'fallStart',
  'fallLand',
  'dirtStep',
];

// Tuning value, reassignable as a one-line constant (research.md).
export const DEFAULT_VOICE_CAP = 6;

// Pure: reorders events to VOICE_PRIORITY_ORDER's rank, then truncates to
// cap (FR-020b). Never consults arrival order or scheduling time — ties
// cannot occur since deriveSoundEvents already guarantees at most one
// entry per id.
export function applyVoiceCap(events: readonly SoundEventId[], cap: number): readonly SoundEventId[] {
  return [...events]
    .sort((a, b) => VOICE_PRIORITY_ORDER.indexOf(a) - VOICE_PRIORITY_ORDER.indexOf(b))
    .slice(0, cap);
}
