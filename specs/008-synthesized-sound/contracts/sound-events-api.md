# Sound Events Contract: `src/lib/audio/events.ts` (new), `src/lib/audio/priority.ts` (new)

This is the one pair of files that turns two consecutive `SessionState`
snapshots into an ordered, capped list of sound event ids. Nothing else in
the codebase decides *whether* an event happened; the playback engine
(`engine.ts`, [audio-playback-api.md](./audio-playback-api.md)) only
decides *how it sounds*.

```ts
export type SoundEventId =
  | 'dirtStep'
  | 'fallStart'
  | 'fallLand'
  | 'diamondCollected'
  | 'doorOpen'
  | 'explosion'
  | 'timeLow'
  | 'bonusTally';

export function deriveSoundEvents(
  prev: SessionState,
  next: SessionState
): readonly SoundEventId[];

export const VOICE_PRIORITY_ORDER: readonly SoundEventId[];
export const DEFAULT_VOICE_CAP: number;
export function applyVoiceCap(
  events: readonly SoundEventId[],
  cap: number
): readonly SoundEventId[];
```

## `deriveSoundEvents` (FR-001–FR-014, FR-042a)

- **Pure**: reads only `prev.screen`/`prev.caveState` and
  `next.screen`/`next.caveState`/`next.screenTicks`, via the sim's
  existing read-only accessors (`getCollected`, `getQuota`/`isDoorOpen`,
  `getCell`, `getPlayerPosition`, `isFalling`, `isExplosion`,
  `getRemainingSeconds`). Never reads `score`, `lives`, `caveIndex`, or
  any camera/viewport/scroll value — there is none to read (FR-042a).
- **Deterministic**: the same `(prev, next)` pair always returns the same
  list, in the same order, with no randomness and no wall-clock read
  (FR-013).
- **At most one of each id** (FR-011): the return value never contains a
  duplicate id, regardless of how many cells independently triggered it
  this tick (a five-boulder landing still yields exactly one `fallLand`).
- **Screen-gated** (FR-012): every id except `bonusTally` requires
  `next.screen === 'playing'`; `bonusTally` requires `next.screen ===
  'caveComplete'` and no other id is ever produced there. No id is ever
  produced on `'title'`, `'caveIntro'`, `'paused'`, `'lifeLost'`,
  `'gameOver'`, or `'won'`.
- **No per-cell allocation** (FR-019, research.md's interpretation): the
  `explosion` and `fallStart`/`fallLand` checks scan the grid with plain
  nested loops over primitive booleans — never building a cell-sized array
  or object. The returned list itself is a plain, bounded (≤8-element)
  array, built once per call.

See [data-model.md](../data-model.md)'s Sound Event table for the exact
per-id condition. `fallStart`/`fallLand`'s neighbor-check algorithm is
research.md's flagged decision — implementation must pin it against the
spec's own ASCII-cave acceptance scenarios (a single fall, a five-boulder
collapse, a roll-off, land-then-immediately-refall) before trusting it
beyond this document's description.

## `applyVoiceCap` (FR-020, FR-020a, FR-020b)

| `events` (any order) | `cap` | result |
|---|---|---|
| `['dirtStep', 'explosion', 'fallLand']` | `2` | `['explosion', 'fallLand']` (priority order, not arrival order) |
| `['fallStart', 'fallLand', 'timeLow']` | `10` | `['timeLow', 'fallStart', 'fallLand']` (cap larger than input — nothing dropped, still reordered to priority) |
| `[]` | `6` | `[]` |

Pure; total order is `VOICE_PRIORITY_ORDER` (`explosion`,
`diamondCollected`, `doorOpen`, `timeLow`, `bonusTally`, `fallStart`,
`fallLand`, `dirtStep`, highest first per FR-020a). Never consults
scheduling time, arrival order, or any random tie-break — ties cannot
occur because `deriveSoundEvents` already guarantees at most one entry per
id.

## The call-site rule this contract depends on

`App.svelte` calls these two functions back-to-back, every tick, **before**
handing anything to the (impure, un-unit-tested) playback engine:

```ts
const events = applyVoiceCap(deriveSoundEvents(previousSession, session), DEFAULT_VOICE_CAP);
audioEngine.play(events, theme.sounds, muted);
```

Both functions are exercised with node-only `vitest` tests
(`tests/lib/audio/events.test.ts`, `tests/lib/audio/priority.test.ts`) that
construct `SessionState` pairs via the existing
`tests/sim/helpers/ascii-cave.ts` harness and plain literal event-id
arrays — no browser, canvas, or audio device (FR-014, FR-020b).

## What is explicitly NOT part of this contract

- How a given event id actually sounds in a given theme —
  [theme-sound-table-api.md](./theme-sound-table-api.md).
- Whether the event is audible at all right now (mute, audio
  availability) — [mute-api.md](./mute-api.md),
  [audio-playback-api.md](./audio-playback-api.md).
- Any per-cell physics rule — this file only *observes* state features
  002–005 already expose; it changes no file under `src/sim/`.
