// Internal to engine.ts — never surfaced to the player.
export type AudioAvailability = 'notCreated' | 'available' | 'unavailable';

// What the impure unlock() observed when it actually tried to construct/
// resume a context.
export type AudioContextOutcome = 'noConstructor' | 'throws' | 'staysSuspended' | 'resumeRejects' | 'healthy';

// Pure, total: 'healthy' -> 'available', every other outcome ->
// 'unavailable' (US4 Independent Test).
export function resolveAvailabilityAfterGesture(outcome: AudioContextOutcome): AudioAvailability {
  return outcome === 'healthy' ? 'available' : 'unavailable';
}
