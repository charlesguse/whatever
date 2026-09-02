// Internal to engine.ts — never surfaced to the player.
export type AudioAvailability = 'notCreated' | 'unlocking' | 'available' | 'unavailable';

// The window-level gesture that may attempt to unlock audio (FR-016, FR-043).
export type InputSource = 'key' | 'click' | 'touch' | 'gamepad';

// What the impure unlock() observed when it actually tried to construct/
// resume a context.
export type AudioContextOutcome = 'noConstructor' | 'throws' | 'staysSuspended' | 'resumeRejects' | 'healthy';

// Pure, total: 'healthy' -> 'available', every other outcome ->
// 'unavailable' (US4 Independent Test).
export function resolveAvailabilityAfterGesture(outcome: AudioContextOutcome): AudioAvailability {
  return outcome === 'healthy' ? 'available' : 'unavailable';
}

// Pure, total: the availability state machine's only entry point out of
// notCreated. Gamepad input MUST NOT unlock audio (FR-043) — browsers grant
// no user activation for it — so it leaves notCreated unchanged no matter
// how many times it fires. key/click/touch carry real activation and move
// the machine into unlocking, but only from notCreated: once the machine
// has left notCreated (unlocking, available, or unavailable) every source
// is a no-op, since a gesture only matters on the way in.
export function nextAvailabilityForInput(current: AudioAvailability, source: InputSource): AudioAvailability {
  if (current !== 'notCreated') return current;
  return source === 'gamepad' ? 'notCreated' : 'unlocking';
}
