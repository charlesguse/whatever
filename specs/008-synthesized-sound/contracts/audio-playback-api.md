# Audio Playback Contract: `src/lib/audio/availability.ts` (new, pure), `src/lib/audio/engine.ts` (new, impure)

This is the boundary between "we decided a sound should play" (the sound-
events and mute contracts) and "a `file://`-safe, always-swallow-failure
device actually makes noise." Everything in `availability.ts` is a pure
function tested in `vitest`; everything in `engine.ts` that touches a real
`AudioContext` is untestable in node and is instead covered by the
maintainer checklist in `spec.md`'s "What the maintainer listens for," per
Principle VII.

```ts
// src/lib/audio/availability.ts (pure)
export type AudioAvailability = 'notCreated' | 'available' | 'unavailable';
export type AudioContextOutcome =
  | 'noConstructor'
  | 'throws'
  | 'staysSuspended'
  | 'resumeRejects'
  | 'healthy';
export function resolveAvailabilityAfterGesture(outcome: AudioContextOutcome): AudioAvailability;

// src/lib/audio/engine.ts (impure — no unit test; maintainer-verified)
export interface AudioEngine {
  unlock(): void;
  play(events: readonly SoundEventId[], sounds: SoundTable, muted: boolean): void;
}
export function createAudioEngine(): AudioEngine;
```

## `resolveAvailabilityAfterGesture` (US4 Independent Test)

| `outcome` | result |
|---|---|
| `'noConstructor'` | `'unavailable'` — neither `AudioContext` nor `webkitAudioContext` exists |
| `'throws'` | `'unavailable'` — the constructor itself threw |
| `'staysSuspended'` | `'unavailable'` — context created but never left `'suspended'` |
| `'resumeRejects'` | `'unavailable'` — `.resume()`'s promise rejected |
| `'healthy'` | `'available'` |

Pure, total, and the exact function `tests/lib/audio/availability.test.ts`
drives with literal outcome strings — no `AudioContext`, no `Promise`
timing, no DOM.

## `createAudioEngine().unlock()` (FR-016, FR-017, FR-018, FR-043, FR-044)

- Idempotent: once availability has resolved to `'available'` or
  `'unavailable'`, later calls are no-ops — the state machine "never
  retries in a way that could block a frame" (US4 Independent Test).
- Called **only** from the *existing* `onAnyKeyDown`/`onAnyClick`/
  `onAnyTouchStart` window listeners in `App.svelte` (feature 007's
  `lastInputSource` plumbing) — never from `GamepadInput.poll()` or any
  gamepad event, structurally satisfying FR-043 the same way feature 007
  made "pointer movement never changes `lastInputSource`" structural.
- Every step — `new (window.AudioContext ?? (window as
  any).webkitAudioContext)()` (FR-017's vendor-prefix fallback),
  `.resume()` — is wrapped in `try`/`catch`/`.catch(() => {})`. No path
  throws to its caller, logs, or surfaces anything to the player (FR-018).

## `createAudioEngine().play(events, sounds, muted)` (FR-018, FR-019, FR-020, FR-029)

- No-ops immediately — no `AudioContext` node is created — when `muted`
  is `true` or availability is not `'available'` (FR-018, FR-029: "events
  are dropped, not buffered," never queued for release on unmute).
- Otherwise, for each id in `events` (already capped by
  `applyVoiceCap` — never more than `DEFAULT_VOICE_CAP` ids), builds and
  starts one short oscillator/noise voice from `sounds[eventId]`
  ([theme-sound-table-api.md](./theme-sound-table-api.md)), entirely
  outside `tick()` (FR-019 — the sim's hot loop calls nothing here).
- Any scheduling error (e.g. a closed context) is swallowed the same way
  `unlock()`'s failures are (FR-018).

## Maintainer-only verification (Principle VII)

CI has no `AudioContext`. The following are **not** covered by any
`vitest` test and are instead the maintainer's checklist items already
written in `spec.md`'s "What the maintainer listens for":

- The vendor-prefixed fallback actually works on first-generation iOS
  Safari (checklist item 10).
- A backgrounded/restored tab produces no burst of stored-up sound
  (checklist item 11).
- A controller-only session stays silent throughout, with the mute
  control still visible and functional (checklist item 12).
- Frame rate holds during a large chain reaction with sound on
  (checklist item, SC-005) — verified on the maintainer's mid-range
  laptop, not by CI.

## What is explicitly NOT part of this contract

- Whether an event was derived at all —
  [sound-events-api.md](./sound-events-api.md).
- Whether the player has chosen to mute — [mute-api.md](./mute-api.md).
- The actual waveform/pitch/envelope data per event per theme —
  [theme-sound-table-api.md](./theme-sound-table-api.md).
