# Sim Contract: `src/sim/` Public Surface (extends feature 004)

This extends
[`specs/004-amoeba-magic-walls/contracts/sim-api.md`](../../004-amoeba-magic-walls/contracts/sim-api.md)
(which itself extends features 001–003's). Everything there still holds
unchanged. This document adds only what's new or changed in this feature —
the cave clock, the sim's only rule change.

## Types

```ts
// ElementId, CaveStatus, MagicWallPhase: UNCHANGED.

export const TICK_RATE_HZ = 8; // NEW — relocated from App.svelte (research.md
                                // Decision 2). The single seconds<->ticks
                                // conversion, imported by both parseCave and
                                // the shell's own tick-loop interval.

interface CaveDefinition {
  name: string;
  width: number;
  height: number;
  seed: number;
  quota: number;
  rows: string[];
  amoebaGrowthRate?: number;
  amoebaSizeLimit?: number;
  magicWallDuration?: number;
  timeLimitSeconds?: number;   // NEW, optional — whole seconds; omitted = no clock
}

interface CaveState {
  readonly width: number;
  readonly height: number;
  readonly tick: number;
  // opaque beyond this — see read accessors below
}
```

## Parse: `parseCave(def: CaveDefinition): CaveState` (extends features 001–004)

- **New guarantee (FR-015)**: throws (no partial grid) if `timeLimitSeconds`,
  when present, is not a positive whole number — naming the cave and the
  offending value, using the same failure discipline as every existing
  validation rule.
- **New, on success**: `CaveState` carries `remainingTimeTicks =
  timeLimitSeconds * TICK_RATE_HZ` when `timeLimitSeconds` is present, or
  `undefined` when it is omitted (no clock — the cave behaves exactly as
  caves do today, FR-009, FR-052).
- **Unchanged**: every feature 001–004 validation rule (declared dimensions
  match row data, exactly one `player`, at most one `exit`, unrecognized
  characters, the quota-vs-diamonds-plus-butterfly-payout ceiling, the
  amoeba/magic-wall parameter ranges).

## Advance: `tick(state: CaveState, input: TickInput): CaveState` (extends features 001–004)

- **New guarantees, evaluated inside the same fixed top-to-bottom,
  left-to-right scan features 001–004 established, still with the per-cell
  moved-this-tick flag**:

  - **Per-tick phase order (amended)**: (1) clear moved-this-tick flags;
    (2) age every explosion cell (unchanged); (3) if `magicWallPhase ===
    'active'`, decrement `magicWallCountdown` (unchanged from feature 004);
    (4) — **new** — if `status === 'inPlay'` and `remainingTimeTicks !==
    undefined` and `remainingTimeTicks > 0`, decrement `remainingTimeTicks`
    by `1`; this step is skipped entirely (no-op) whenever the cave has no
    time limit, and never decrements below `0`; (5) stamp every entry in
    `pendingBlasts` (unchanged); (6) run the main scan — player movement
    (which may set `status = 'completed'` on entering an open door,
    unchanged from feature 002), body falling/rolling/pushing, enemy steps,
    amoeba growth, expanding wall growth (all unchanged from features
    001–004); (7) the amoeba collective's size-limit/sealed conversion
    (unchanged from feature 004); (8) — **new** — if, after the main scan,
    `status === 'inPlay'` and `remainingTimeTicks === 0`, set `status =
    'dying'` directly (no `stampBlast`, no cell touched, nothing queued in
    `pendingBlasts`); (9) the existing closing check — `if (status ===
    'dying' && !hasAnyExplosion(grid)) status = 'dead'` (unchanged) —
    resolves a timeout death to `'dead'` in this same tick, since no
    explosion cell was ever stamped for it.

  - **Completion beats expiry (FR-014)**: because step 8's expiry check runs
    *after* the main scan (step 6, where a door-entry completion is
    detected), a tick on which the kid enters the open door and the clock
    would otherwise reach zero always finds `status === 'completed'`
    already at step 8 and skips the expiry check entirely — the door wins,
    with whatever `remainingTimeTicks` value that tick ends at (possibly
    `0`) available to `getRemainingSeconds` for the bonus.

  - **Freeze while not `inPlay` (FR-011)**: step 4's decrement is gated on
    `status === 'inPlay'` read at the *start* of that step, before step 6
    can change it — so a cave already `'dying'`, `'dead'`, or `'completed'`
    at the start of a tick never has `remainingTimeTicks` touched that tick,
    and a cave that *becomes* non-`'inPlay'` partway through a tick (e.g. a
    falling boulder crushes the kid during the main scan) had its decrement
    for that tick already evaluated (or skipped) before that happened — the
    clock's value for that tick is whatever it was going into step 4.

  - **Determinism (FR-051, extends feature 004's FR-037/FR-042/FR-043)**:
    same `state` + same `input` always produces the same next `state`,
    including `remainingTimeTicks`, for any replay of the same seed and
    ordered inputs. The clock consumes **zero** PRNG draws — a cave with a
    time limit takes exactly as many draws per tick as the same cave would
    without one.

## Read accessors (new, alongside existing accessors)

```ts
function getRemainingSeconds(state: CaveState): number | undefined;
```

- **Guarantees**: A pure read, no mutation path exists. Returns `undefined`
  when the cave has no time limit. Otherwise `Math.ceil(remainingTimeTicks /
  TICK_RATE_HZ)`, never negative, equal to the cave's full `timeLimitSeconds`
  at tick zero, and equal to `0` only once `remainingTimeTicks` has actually
  reached `0` (FR-012). This is the only way anything outside `src/sim/` may
  observe the clock; the shell MUST NOT keep its own copy or derive a
  competing value (FR-044).

## ASCII helpers (extends features 001–004's `caveFromAscii`/`asciiFromState`)

**Unchanged signatures.** `AsciiCave`/test-helper `CaveOptions` gain one new
optional pass-through field, `timeLimitSeconds`, forwarded into
`CaveDefinition` — so ASCII-cave tests can set a time limit without
hand-building a `CaveDefinition`. `remainingTimeTicks` is not part of the
ASCII grid representation — tests that need to assert on it use
`getRemainingSeconds` directly alongside `expectAscii`, the same pattern
feature 004 established for `getMagicWallPhase`.

## What is explicitly NOT part of this contract

Same exclusions as features 001–004 (camera, theme data, keyboard held-key
logic, door-flash timing), plus: score, lives, screens, and persistence —
all of that is shell-owned (`contracts/session-api.md`), never a sim
concern (FR-045, FR-050). The sim knows only that a cave is `'inPlay'`,
`'dying'`, `'dead'`, or `'completed'`, and — new in this feature — how many
ticks are left, if any; it has no notion of "lives" or "points."
