# Phase 0 Research: Fireflies, Butterflies, and Explosions

The spec (`spec.md`) contains no `[NEEDS CLARIFICATION]` markers — its
Assumptions section already resolved every open question a spec author would
normally leave to research (turning preference, cadence ratio, step
algorithm, initial facing, explosion lifetime, contact adjacency, blast
center/content, door survival, crush blooming, chain pacing, the dying
state, and the relaxed quota check). This document records the
implementation-pattern decisions needed to turn those resolved rules into
code over the existing feature-001/002 sim, plus two decisions this feature
itself must make that the spec left to "how you build it": how detonation
triggers compose with the existing per-cell scan, and how a one-tick-deferred
chain link is represented as state.

## Decisions

### Decision: Enemy facing is a third parallel typed array on `Grid`, and `Direction` moves to `grid.ts`

- **Rationale**: FR-003 requires facing to be carried cell-to-cell state,
  never recomputed at read time — exactly the shape `falling` already has
  (feature 002). A `Uint8Array` sized `width*height`, cloned in `cloneGrid`
  alongside the existing arrays, indexed by the same `index(x,y)` helper,
  is meaningful only where the cell currently holds `firefly` or
  `butterfly`; movement code sets it at an enemy's destination cell and
  never needs to clear it at the origin, since a stale value at a
  non-enemy cell is never read. `Direction` (`'up' | 'down' | 'left' |
  'right'`) already exists in `tick.ts` for `TickInput`, and is exactly the
  four-way type facing needs — rather than defining a second identical
  type, `Direction` and its index mapping move to `grid.ts` (where the new
  array lives) and `tick.ts` re-exports it, so the one existing import site
  (`tests/sim/helpers/ascii-cave.ts` imports `Direction` from `'../../../src/sim/tick'`)
  keeps working unchanged.
- **Alternatives considered**: Deriving facing from the two most recent
  positions (rejected — explicitly forbidden by FR-003, and undefined for
  an enemy that just turned in place without moving); a second `Direction`
  type local to `grid.ts` (rejected — two types with the same four values
  is the kind of drift Principle III's "one mapping" discipline exists to
  prevent, just applied to directions instead of element ids).

### Decision: Explosion cells carry state in two more parallel typed arrays, `explosionRemaining` and `explosionContent`

- **Rationale**: FR-019 requires each explosion cell to carry "how long it
  has left and what it will become" as cell state. Two `Uint8Array`s of the
  usual shape do this with no per-cell object: `explosionRemaining` is `0`
  for a non-explosion cell and counts down from `2`; `explosionContent`
  stores the target element's index (`empty` or `diamond`) and is only
  meaningful while `explosionRemaining > 0`. This is the same pattern as
  `falling`, just two arrays instead of one because an explosion cell needs
  a duration *and* a payload, where falling only ever needed a flag.
- **Alternatives considered**: Encoding remaining-ticks into spare bits of
  the existing `cells` byte alongside element id (rejected — same objection
  as feature 002's falling-flag decision: couples element-identity encoding
  to a physics detail for no real memory win at this grid size); a single
  array storing a combined (remaining, content) code (rejected — two plain
  arrays are simpler to read and to reset than unpacking a composite code
  every tick).

### Decision: One explosion age/convert pass runs once per tick, before the main scan, over the whole grid

- **Rationale**: FR-019/FR-020 require every cell of one blast to convert
  on the same tick, and require the newly-converted content to take no
  action (fall/roll) on its creation tick. Decrementing `explosionRemaining`
  for every cell where it's nonzero, and converting to `explosionContent`
  wherever it reaches zero, is naturally a full-grid pass rather than
  something that fits the existing per-cell dispatch (which is keyed off
  *current* element id, and an explosion cell's element id is already
  `explosion` for its whole life — there is nothing for the main scan to
  branch on). Running it immediately after `clearMovedFlags` and marking
  any cell that converts **to `diamond`** as moved-this-tick reuses the
  existing moved-flag mechanism to suppress that gold star's fall/roll for
  exactly its creation tick (FR-020) — a cell converting to `empty` needs no
  such suppression, since nothing acts on `empty`.
- **Alternatives considered**: Aging explosion cells inside the main scan
  when they're visited in top-to-bottom order (rejected — an explosion
  cell's remaining-ticks countdown is not affected by scan order the way a
  falling body's chain is; running it as part of the ordered dispatch would
  make cells in the same blast convert on different sub-steps of the same
  tick depending on their position, which contradicts "all cells of one
  blast MUST then convert... on the same tick"); aging lazily at read time
  (rejected — FR-019 requires the countdown to be carried state, and a
  lazily-computed remaining count from "tick blast was stamped" would need
  the stamp tick stored anyway, which is no simpler and reintroduces the
  bug class Principle II's "no randomness/time at read time" guards against
  for exactly this kind of state).

### Decision: A chain link is one entry in a small `pendingBlasts` array on `CaveState`, stamped at the start of the next tick

- **Rationale**: FR-023 requires an enemy destroyed by a blast to detonate
  its own blast on the *following* tick, centered on its own cell, with its
  own content — a delay that must survive from one `tick()` call to the
  next. `CaveState` already carries state across calls (`collected`,
  `status`, `rngState`); a `readonly { x: number; y: number; content:
  'empty' | 'diamond' }[]` is the same kind of small, tick-to-tick value,
  sized to the number of enemies destroyed on the previous tick's blasts
  (never the grid size). It is computed fresh each tick (cleared and
  rebuilt), not appended to unboundedly, so it does not grow across a long
  run. Stamping it as its own phase before the main scan (right after the
  age/convert pass) means every blast this tick — whether a deferred chain
  link or a trigger discovered during this tick's own scan — is applied in
  a single, well-defined order, and FR-022's "later stamp in this tick's
  resolution order wins" falls out for free: whichever call to the shared
  `stampBlast` helper runs later in that order simply overwrites what an
  earlier one wrote to a shared cell.
- **Alternatives considered**: A per-cell "pending detonation" flag array
  sized to the grid (rejected — one more `width*height` array to track
  something that, in practice, only ever holds as many entries as there are
  enemies in flight in one chain; a plain small array is both simpler and
  smaller); resolving the whole chain inside the tick it starts, with an
  inner loop that keeps re-scanning newly-destroyed enemies until none
  remain (rejected — this is exactly the "atomic" alternative the spec's
  Assumptions section explicitly rejects in favor of one link per tick, and
  it would make the chain's visible pace an implementation accident rather
  than a stated rule).

### Decision: Detonation triggers are inline branches in the existing dispatch, not a separate detection pass

- **Rationale**: FR-010–FR-013 name three trigger sites, and each one
  already has a natural home in code that exists today or is being added
  for FR-002–FR-009: (1) an enemy's own step (new code, FR-010) checks its
  four orthogonal neighbors for the kid before attempting to move, and
  detonates instead of moving if found; (2) `processBody`'s existing "is
  the cell below me the kid" check (feature 002) gains a sibling check for
  "is the cell below me an enemy," and both branches now stamp a blast
  (centered on whatever they found) instead of the old direct
  move-onto-kid/nothing behavior, and in both cases the body itself is
  *not* moved into that cell — it is consumed by the blast because the
  blast's 3x3 already covers the body's own cell one row above the center;
  (3) an enemy caught inside *any* stamped blast (from trigger 1, trigger
  2, or a deferred chain link) is detected by the shared `stampBlast`
  helper itself, at the moment it would overwrite a `firefly`/`butterfly`
  cell that is not the blast's own center — this is what queues the next
  link (FR-023) with no separate "scan for enemies in this 3x3" step,
  because `stampBlast` already visits exactly those nine cells. No fourth,
  independent "find all detonations this tick" pass is needed anywhere.
- **Alternatives considered**: A dedicated pre-scan that collects every
  detonation for the tick before applying any of them (rejected — this is
  more code than reusing the sites where the trigger conditions are already
  being evaluated, and it would need its own ordering rule to satisfy
  FR-022, duplicating what "apply immediately, later wins" already gives
  for free).

### Decision: The kid's "dying" state needs no explicit input-ignoring code — it is a consequence of the kid's cell no longer being `'player'`

- **Rationale**: FR-015.1 requires input to be ignored once the kid has
  detonated. The main scan's dispatch is keyed on the *current* element id
  at each cell (`if (id === 'player') movePlayer(...)`); the only way the
  kid ever detonates is via `stampBlast` overwriting their cell to
  `explosion` in the same tick the death occurs. From the very next tick
  onward there is no cell anywhere in the grid holding `'player'`, so
  `movePlayer` is never invoked again — input is discarded by the shell
  calling `tick()` with it, same as always, but nothing in the sim ever
  looks at it. This satisfies FR-033's "the shell MUST NOT reimplement the
  input-ignoring rule" as literally as possible: there is no rule to
  reimplement, because the state that would need checking (whether the kid
  is alive) is already fully expressed by whether a `'player'` cell exists.
  `getPlayerPosition` keeps returning the frozen death coordinates (the
  same behavior feature 002's data-model.md already documents for the old
  crush death), which is enough for camera/rendering continuity through the
  dying state.
- **Alternatives considered**: A `status === 'dying'` guard at the top of
  `movePlayer` (rejected — redundant with the structural fact above, and
  exactly the kind of shell-visible "second source of truth" the spec's
  FR-033 warns against by naming the risk explicitly).

### Decision: `'dying' -> 'dead'` is a single end-of-tick check: "is there still any explosion cell anywhere in the grid?"

- **Rationale**: FR-015.3 requires the transition on "the first tick on
  which no explosion cell remains anywhere." Checking
  `explosionRemaining[i] > 0` for any `i` after this tick's age/convert
  pass and all of this tick's new stamps is a single linear scan of one
  typed array — cheap, and correct regardless of how many independent
  blasts or chain links are in flight, since it doesn't need to know which
  blast any given explosion cell belongs to. This runs only while
  `status === 'dying'` (an early return keeps it from running every tick of
  ordinary play), and once it flips to `'dead'`, the existing terminal
  early-return (extended to check `'dead' || 'completed'`, not `'dying'`)
  takes over exactly as feature 002's FR-029 already does for `'dead'`.
- **Alternatives considered**: Tracking a live explosion *count* incrementally
  (incremented on stamp, decremented on convert) to avoid the scan
  (rejected — the count would need to be part of `CaveState` and kept in
  perfect sync across every stamp/convert site, including the overlap case
  where two blasts hit the same cell in one tick (FR-022) without
  double-counting or double-decrementing it; a recomputed scan has no
  synchronization bug to have, and it only runs during the rare `'dying'`
  window, not on every tick of ordinary play).

### Decision: The parse-time quota check counts butterflies alongside diamonds, in the same loop

- **Rationale**: FR-025 relaxes the existing "quota must not exceed
  diamonds drawn" check (feature 002's FR-027) to "quota must not exceed
  diamonds drawn plus nine per butterfly." The existing parse loop in
  `parseCave` already counts diamonds and player/exit positions in one pass
  over every cell; adding a `butterflyCount` counter to that same loop and
  changing the final comparison to `quota > diamondCount + 9 * butterflyCount`
  is the smallest change that satisfies the new rule, and keeps the
  "reject only genuinely malformed data" framing from the spec's
  Assumptions intact — nine is a generous per-butterfly upper bound, not a
  claim of winnability.
- **Alternatives considered**: A separate second pass over the grid just to
  count butterflies (rejected — the existing loop already visits every
  cell once; a second pass would be pure waste for a value obtainable for
  free in the first).

## Outstanding Unknowns

None. All Technical Context fields in `plan.md` are resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
