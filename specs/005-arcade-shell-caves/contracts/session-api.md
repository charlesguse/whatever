# Session Contract: `src/lib/session/` Public Surface (new in this feature)

There is no prior version of this contract — features 001–004 had no
session concept at all (`App.svelte` owned a single, permanent `CaveState`
directly). This document defines the entire new surface. It sits above,
and only ever reads, [`contracts/sim-api.md`](./sim-api.md) — this module
never reimplements a sim rule (`CLAUDE.md`'s sim/shell line).

Everything here is **plain TypeScript** — no Svelte import, no DOM access,
no `localStorage` call (that is `src/lib/storage/save.ts`, invoked by
`App.svelte`, not by this module) — so it is readable and testable without
a browser, canvas, or storage (FR-045).

## Types

```ts
type Screen =
  | 'title'
  | 'caveIntro'
  | 'playing'
  | 'paused'
  | 'lifeLost'
  | 'caveComplete'
  | 'gameOver'
  | 'won';

interface SessionState {
  readonly screen: Screen;
  readonly score: number;         // >= 0, never decreases (FR-016)
  readonly lives: number;         // starts 3, never regenerates (FR-022, FR-024)
  readonly caveIndex: number;     // 0-based index into CAVES; always 0 for a new game (FR-002)
  readonly caveState: CaveState;  // the current cave's live sim state (sim-api.md)
  readonly attemptEnded: boolean; // internal — guards endAttempt against firing twice per attempt
  readonly screenTicks: number;   // internal — drives each non-playing screen's auto-advance delay
}
```

## `startGame(): SessionState`

- **Guarantees**: Always produces `screen: 'caveIntro'`, `score: 0`,
  `lives: 3`, `caveIndex: 0`, `caveState` freshly built from `CAVES[0]`
  (FR-002, Acceptance Scenarios 1 and 5). Ignores any stored "furthest
  cave" value entirely — a new game always begins at cave one (FR-002); a
  furthest-cave badge is display-only, read and shown separately by the
  title screen from `src/lib/storage/save.ts`, never fed into this
  function.

## `tickSession(session: SessionState, input: TickInput): SessionState`

- **Guarantees**:
  - If `session.screen !== 'playing'`, returns `session` unchanged — **no**
    call to the sim's `tick()` — which is what makes pause, the cave intro,
    the tally, and every terminal screen correctly freeze the clock and the
    grid (FR-011, FR-028, FR-030) without the sim needing to know a screen
    exists.
  - Otherwise calls `tick(session.caveState, input)` exactly once.
  - **Scoring (FR-016–FR-018, FR-017a)**: compares `getCollected()` on the
    cave state before and after this call. If it increased by one, adds
    `starValue(preCollected, quota)` to `score` (`scoring.ts` — 10 or 15
    points, using the *pre-collection* collected count, per the boundary-star
    decision in `research.md`/`data-model.md`). No other tick outcome adds
    to `score` (FR-018).
  - **Death (FR-013, FR-023)**: if the new `getStatus()` is `'dead'` and the
    old one was not, calls `endAttempt(session, 'death')` (below) and
    returns its result instead of a plain `playing` update.
  - **Completion (FR-006, FR-014, FR-019)**: if the new `getStatus()` is
    `'completed'` and the old one was not, adds
    `bonusFor(getRemainingSeconds(session.caveState))` to `score` exactly
    once, and returns `screen: 'caveComplete'`, `screenTicks: 0`. The bonus
    number is final at this point — the tally screen only animates toward
    it (FR-020).
  - Otherwise returns `screen: 'playing'` with the advanced `caveState` and
    updated `score`.

## `pauseToggle(session: SessionState): SessionState`

- **Guarantees**: `screen: 'playing'` → `'paused'`, or `'paused'` →
  `'playing'`; a no-op (returns `session` unchanged) from every other
  screen. Never calls `tick()` in either direction. `caveState` (grid, tick
  count, `remainingTimeTicks`) is byte-identical before and after any
  number of calls that end back on the same screen (FR-028, FR-029,
  FR-030) — a cave paused across any number of real-world seconds and
  resumed is identical, tick for tick, to one never paused.

## `restartAttempt(session: SessionState): SessionState`

- **Guarantees**: Reachable from `'playing'`, `'paused'`, `'caveIntro'`, and
  `'lifeLost'` (FR-027). Calls `endAttempt(session, 'restart')` and returns
  its result. Per `endAttempt`'s own contract below, this costs a life only
  when the current attempt had not already ended (FR-027a) — restart from
  `'lifeLost'` (the life is already spent) or from `'caveIntro'` (the
  attempt has not started) costs nothing further.

## `endAttempt(session: SessionState, cause: 'death' | 'restart'): SessionState`

- **Internal** to the session module — not called directly by `App.svelte`;
  reached only through `tickSession` (on a detected death) or
  `restartAttempt` (on a voluntary restart). Documented here because its
  guarantee is the load-bearing one for FR-023/FR-027/FR-027a.
- **Guarantees**:
  - **Idempotent per attempt**: if `session.attemptEnded` is already `true`,
    returns `session` unchanged regardless of `cause` — this is what makes
    "a death and a restart on the same tick cost one life, not two" true by
    construction (spec Edge Cases; FR-027a).
  - Otherwise: decrements `lives` by exactly `1` and sets `attemptEnded:
    true`.
  - If `lives === 0` after the decrement: returns `screen: 'gameOver'`,
    `caveState` unchanged (not reloaded — the game is over) — reachable
    identically whether `cause` was `'death'` or `'restart'` (FR-025,
    "the player MUST NOT be able to continue a finished game").
  - Otherwise: rebuilds `caveState` from `CAVES[caveIndex]` via a fresh
    `parseCave` call — **never** from a stored snapshot (FR-027b) — resets
    `attemptEnded: false` for the new attempt, and:
    - if `cause === 'death'`: returns `screen: 'lifeLost'`, `screenTicks: 0`
      (FR-005 — the life-lost screen shows before the reload is played);
    - if `cause === 'restart'`: returns `screen: 'playing'` directly,
      skipping `'lifeLost'` (FR-005's last sentence, FR-027a — a voluntary
      restart reloads at once, with no screen to wait out).

## `advanceScreen(session: SessionState): SessionState`

- **Guarantees**: Applies only to `'caveIntro'`, `'lifeLost'`,
  `'caveComplete'`, `'gameOver'`, and `'won'` — a no-op elsewhere.
  - `'caveIntro'` → `'playing'` (the attempt's first tick has not run yet;
    `attemptEnded` starts `false`).
  - `'lifeLost'` → `'caveIntro'` for the just-reloaded cave.
  - `'caveComplete'` → `'caveIntro'` for `CAVES[caveIndex + 1]`
    (`caveIndex` incremented, `caveState` rebuilt fresh), or `'won'` if
    `caveIndex` was already `7` (the eighth cave, `0`-based) — FR-006.
  - `'gameOver'` and `'won'` → `'title'` (FR-007). This is the point
    `App.svelte` writes the final `score`/`caveIndex` to
    `src/lib/storage/save.ts`, not a concern of this pure function itself
    (FR-039 — writes happen at "whenever a game ends" and "whenever a cave
    begins," both shell-level moments this function's return value marks).
  - Called either on a documented keypress (consuming a *press*, never a
    held key, FR-049) or once `session.screenTicks` (advanced by
    `tickSession`'s caller on every render/tick frame while not `'playing'`)
    reaches that screen's own documented delay — whichever comes first
    (FR-003, FR-005, FR-007).

## `scoring.ts`

```ts
function starValue(preCollected: number, quota: number): 10 | 15;
function bonusFor(remainingSeconds: number): number;
```

- `starValue`: `preCollected >= quota ? 15 : 10` (FR-017; the boundary-star
  reading is documented in `research.md` and `data-model.md`).
- `bonusFor`: identity — returns `remainingSeconds` unchanged (FR-019);
  `0` in, `0` out (spec Edge Cases — "a cave completed with zero seconds
  left").
- Both are pure, total functions over plain numbers — no `SessionState`,
  no sim import.

## What is explicitly NOT part of this contract

`localStorage` reads/writes (`src/lib/storage/save.ts` — invoked by
`App.svelte` at the moments this contract's functions return a
`'gameOver'`/`'won'`/new-cave transition, not by the session module
itself); keyboard event handling (`src/lib/input/keyboard.ts`, unchanged
shape plus two new one-shot keys); rendering of any screen or the HUD
(Svelte markup in `App.svelte`, reading this module's return values and
the sim's accessors, never keeping a local copy, FR-044).
