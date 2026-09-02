# Theme Sound Table Contract: `src/lib/themes/types.ts` (extended), `src/lib/themes/classroom.ts` / `classic.ts` (extended)

Sound joins color/glyph/label as one more themed field family (constitution
Principle III) — a required entry on `Theme`, plain data, no functions, no
theme-id branch anywhere outside the theme's own file.

```ts
// src/lib/themes/types.ts (extends the existing Theme interface)
export interface VoiceSpec {
  readonly waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'noise';
  readonly frequencyHz: number;       // [20, 20000]
  readonly frequencyEndHz?: number;   // [20, 20000]; omitted = constant pitch
  readonly durationMs: number;        // (0, 2000]
  readonly attackMs: number;          // >= 0
  readonly releaseMs: number;         // >= 0; attackMs + releaseMs <= durationMs
  readonly level: number;             // [0, 1]
  readonly noiseMix: number;          // [0, 1]; 0 = pure oscillator, 1 = pure noise
}

export type SoundTable = Readonly<Record<SoundEventId, VoiceSpec>>;

export interface Theme {
  // ...every existing field, unchanged...
  readonly sounds: SoundTable; // NEW, required
}
```

## Completeness (FR-034, FR-036, FR-037, SC-002, SC-007)

- `sounds` is a **required** field — TypeScript refuses to compile a theme
  object missing it or missing any one `SoundEventId` key, before any test
  runs.
- `tests/lib/themes/sound-table-completeness.test.ts` mirrors
  `registry-completeness.test.ts`'s existing shape: iterates
  `listThemes()`, asserts every `SoundEventId` has an entry (failure names
  both the theme id and the missing event id, never a bare boolean), and
  asserts every field's declared range holds for every `(theme, eventId)`
  pair.
- Adding a theme touches only that theme's file and the registry entry
  (`registerTheme(...)` call) — no `src/sim/` file, no rendering module,
  no `src/lib/audio/` file (SC-007, demonstrated by reviewing the changed-
  file list, not by shipping a third theme).
- No file under `src/sim/`, no rendering module, and no `src/lib/audio/`
  module may branch on a theme id (FR-036) — every theme-specific value
  reaches the engine only via `theme.sounds[eventId]`, read generically.

## Distinctness and level parity (FR-039)

| Check | Rule |
|---|---|
| Per-event distinctness | For every `SoundEventId`, `classroomTheme.sounds[id]` must differ from `classicTheme.sounds[id]` in at least one field — a theme that copies another wholesale fails the test |
| Level parity | Every `VoiceSpec.level` across every registered theme and every event id falls inside one shared declared range (e.g. `[0.05, 0.9]`, tuned at implementation time) — switching theme is never an audible volume jump |

## Declared ranges (asserted by the completeness test, FR-035)

| Field | Range |
|---|---|
| `frequencyHz`, `frequencyEndHz` (if present) | `[20, 20000]` |
| `durationMs` | `(0, 2000]` — short enough to be over before masking the next same-id event at the game's 8Hz tick rate (FR-021) |
| `attackMs`, `releaseMs` | `>= 0`, and `attackMs + releaseMs <= durationMs` |
| `level` | `[0, 1]`, and within the shared cross-theme band above |
| `noiseMix` | `[0, 1]` |

## What is explicitly NOT part of this contract

- Whether a `VoiceSpec` is actually turned into audible sound — that is
  `engine.ts`'s job
  ([audio-playback-api.md](./audio-playback-api.md)), verified by the
  maintainer's ear, not by any range test here (the ranges only guard
  against malformed *data*, never against "does it sound good").
- Which event ids exist — that is
  [sound-events-api.md](./sound-events-api.md)'s closed `SoundEventId`
  set; this contract only requires every theme to cover all of them.
