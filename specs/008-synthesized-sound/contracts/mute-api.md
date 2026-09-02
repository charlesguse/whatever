# Mute Contract: `src/lib/audio/mute.ts` (new), `src/lib/storage/save.ts` (extended), input sources (extended)

Mute is one global boolean, reachable from every input source the way
feature 007 made cycle-theme reachable, persisted like `themeId` rather
than like a grow-only score field.

```ts
// src/lib/audio/mute.ts
export function resolveStoredMute(stored: unknown): boolean;
export function toggleMute(muted: boolean): boolean;

// src/lib/storage/save.ts (extends the existing SaveRecord)
export interface SaveRecord {
  readonly highScore: number;
  readonly furthestCave: number;
  readonly themeId?: string;
  readonly muted?: boolean; // NEW
}
```

## `resolveStoredMute` (FR-032)

| `stored` | result |
|---|---|
| `true` | `true` |
| `false` | `false` |
| `undefined` | `false` (default — first-time player is unmuted) |
| `null` | `false` |
| `'true'` (string) | `false` (malformed — not literally `boolean`) |
| `1` (number) | `false` (malformed) |

Total, never throws — the same defensive shape `resolveStoredThemeId`
already has for `themeId`.

## `toggleMute` (independent test: "N toggles land on the parity of N")

`toggleMute(false) === true`; `toggleMute(true) === false`. Trivial
negation, exported so tests drive it directly instead of reimplementing
`!` in the test file, and so `App.svelte`'s own toggle call site reads as
"call the named action," matching `cycleThemeId`'s existing precedent.

## `SaveRecord.muted` persistence (FR-031, FR-033)

- `readSave`: `muted` is accepted only when `typeof record.muted ===
  'boolean'`; anything else (missing key, `null`, a string, a number)
  yields `muted: undefined` from `readSave`, which `resolveStoredMute`
  then resolves to `false` at the call site — exactly `themeId`'s existing
  two-step "storage layer says maybe-a-string, selection layer resolves
  the maybe" split.
- `writeSave`: `muted: record.muted ?? current.muted` — **last-write-wins**,
  not `Math.max`. A call that omits `muted` leaves the stored value
  untouched (so `writeSave({ highScore })` on a game-over screen does not
  silently unmute a muted player); a call that passes `muted` always
  replaces it.
- Every `writeSave`/`readSave` failure path (throwing storage, full quota,
  disabled storage) already degrades to "in-memory only, no throw, no
  warning" for every other field — `muted` inherits that for free, no new
  `try`/`catch` needed (FR-033).

## Reachability (FR-024, FR-025, FR-026, FR-027)

| Source | New surface | Fires |
|---|---|---|
| `KeyboardInput` | `MUTE_KEYS = new Set(['m', 'M'])`; `consumeMute(): boolean` | one-shot, cleared on read — identical shape to `consumeCycleTheme()` |
| `GamepadInput` | `MUTE_BUTTON_INDEX` (flagged `4`, left shoulder) in `gamepad/bindings.ts`; `consumeMute(): boolean` | edge-triggered via the existing `mapOneShotButtons` — fires once per press, never repeats while held (FR-026) |
| `TouchInput` | `consumeMute(): boolean` | **always returns `false`** — mirrors `consumeCycleTheme()`'s existing stub; the real touch/pointer route is the on-screen button below, a native element, not this class |
| On-screen | A new `<button aria-pressed={muted}>` in `App.svelte`, always rendered on every screen regardless of audio availability (FR-041) | native `click`, works for mouse and touch with no custom hit-testing |

`App.svelte`'s `stepTickInner()` reads
`orAll(keyboard.consumeMute(), touch.consumeMute(), gamepad.consumeMute())`
unconditionally, at the same point `consumeCycleTheme()` is already read —
**before** any screen branch, so a mute press:

- works identically from `'title'`, `'caveIntro'`, `'playing'`, `'paused'`,
  `'lifeLost'`, `'caveComplete'`, `'gameOver'`, and `'won'` (FR-025,
  Acceptance Scenario US2#6);
- never also starts a game, advances a screen, moves the kid, pauses,
  restarts, or switches themes, because `MUTE_KEYS`/`MUTE_BUTTON_INDEX`
  are disjoint from every other binding (FR-025);
- never touches `SessionState` — `toggleMuted()` only reassigns the
  `muted` local and calls `writeSave`, never `session` (FR-030).

## What is explicitly NOT part of this contract

- Whether a sound is actually produced when unmuted — that also depends
  on `AudioAvailability`
  ([audio-playback-api.md](./audio-playback-api.md)).
- The on-screen button's exact CSS/position — a rendering detail, not a
  contract; only its always-present, always-functional, `aria-pressed`-
  reporting behavior is load-bearing (FR-027, FR-041).
