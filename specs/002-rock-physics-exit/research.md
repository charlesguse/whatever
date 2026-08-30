# Phase 0 Research: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

The spec (`spec.md`) contains no `[NEEDS CLARIFICATION]` markers — its
Assumptions section already resolved every open question a spec author would
normally leave to research (roll-direction preference, push-chance ownership,
grab-key/restart-key exact bindings, door cardinality, quota semantics). This
document records the implementation-pattern decisions needed to turn those
resolved rules into code over the existing feature-001 sim, plus the two
decisions the spec explicitly left as "a starting value, tunable at review"
rather than as an open question.

## Decisions

### Decision: One per-body-per-tick algorithm drives falling, rolling, and crushing, evaluated in a fixed order

- **Rationale**: FR-001–FR-010 read as a list of independent rules, but they
  are one state machine per boulder/diamond cell, evaluated every tick in
  this order: (1) if the cell below is empty, move down and mark falling;
  (2) else if the cell below holds the kid, kill the kid only if this body is
  currently marked falling (a resting body above the kid is furniture,
  FR-005/FR-008); (3) else check the roll surfaces (boulder, diamond, brick
  wall) left-first then right — if the side and its diagonal-below are both
  empty, move that direction and mark falling (a roll is a horizontal move
  that resumes falling next tick, per the spec's Assumptions); (4) otherwise
  clear the falling flag — the body is at rest. Running this check every
  tick (not only on the tick a body first lands) is what makes a previously-
  resting body start rolling later if a dig removes a blocking neighbor, and
  is what FR-046's "not rolling because the diagonal is occupied while the
  side is empty" case actually exercises.
- **Alternatives considered**: A separate "has this body ever rested" flag
  gating the roll check (rejected — the spec never asks for one-time roll
  resolution, and a plain per-tick check is simpler and already covers the
  "roll opens up later" case for free); resolving fall/roll/crush as three
  separate passes over the grid (rejected — three scans instead of one, and
  splitting them risks reintroducing the "simultaneous update" bug
  `CLAUDE.md` explicitly warns against, since a second pass would not see
  the moved-this-tick flags the first pass set).

### Decision: `falling` is a second parallel typed array on `Grid`, alongside the existing `movedThisTick`

- **Rationale**: FR-002 requires falling to be carried cell-to-cell state,
  never recomputed at read time, and Constitution Principle VI forbids
  per-cell objects. `movedThisTick` already established the pattern (a
  `Uint8Array` sized `width*height`, cloned in `cloneGrid`, indexed by the
  same `index(x,y)` helper as `cells`); `falling` is one more array of the
  same shape. Unlike `movedThisTick`, it is *not* cleared at the start of
  every tick — it persists until the falling/rolling algorithm above
  explicitly sets or clears it, since that is the entire point of FR-002.
- **Alternatives considered**: Packing falling into spare bits of the
  existing `cells` byte (rejected — `ELEMENT_IDS` already uses small
  integers and this would couple element identity encoding to a physics
  flag for no real memory win at this grid size); a `Set<number>` of falling
  cell indices (rejected — slower membership checks in the hot scan and an
  allocation pattern the fixed-array approach avoids entirely).

### Decision: Push resolution lives inside the same scan, at the player's cell, gated by eligibility before any draw

- **Rationale**: FR-012–FR-016 require that only an *eligible* push (cell
  beyond the eraser in-grid and empty, eraser not currently falling, and the
  press is horizontal) ever draws from the seeded generator, and that an
  ineligible push leaves the generator untouched (FR-013, and the "most
  likely to rot" test called out in FR-046). The natural place to check this
  is exactly where feature 001's `movePlayer` already inspects the
  destination cell: extend that inspection to detect "destination is a
  resting eraser, beyond-cell is empty and in-grid, direction is horizontal"
  as the eligibility gate, and only inside that branch call `nextPrng` once
  and compare against `PUSH_CHANCE`. Every other destination case (wall,
  door, out-of-grid-beyond, falling eraser, vertical press) returns from the
  same function without touching `state`'s rng at all, which is what makes
  "a later eligible push lands on the same tick either way" (FR-046) true by
  construction rather than by a special-cased skip.
- **Alternatives considered**: Always drawing once per tick and discarding
  the value on an ineligible push (rejected — directly violates FR-013's
  determinism requirement: two replays that differ only in a hopeless push
  would then diverge, which is the exact bug the spec calls out); a separate
  "push resolution" pass after the main scan (rejected — the push is a
  single atomic movement of two bodies in one tick, and the main scan
  already visits the player's cell at the right point in top-to-bottom,
  left-to-right order; a second pass buys nothing and risks re-processing).

### Decision: `PUSH_CHANCE` is one named constant in `src/sim/tick.ts`, value `1/8`

- **Rationale**: FR-015 fixes the mechanism (a fixed per-tick chance drawn
  from the cave's seeded generator) and gives "roughly one in eight" as the
  starting value, explicitly calling it a tuning dial for the maintainer's
  feel review, not a re-decidable rule. Defining it once next to the only
  code that reads it satisfies "never repeated at a call site" (FR-015)
  trivially — there is exactly one call site.
- **Alternatives considered**: Making it cave data (rejected — the spec
  scopes push chance as a single project-wide constant, not per-cave tuning;
  cave data already owns quota and seed, and adding a third numeric knob
  here is unrequested scope); computing it from the tick rate (rejected —
  no such relationship is asked for, and it would make the constant harder
  to find and tune).

### Decision: Cave status (`inPlay` / `dead` / `completed`) is a plain field on `CaveState`, checked once at the top of `tick`

- **Rationale**: FR-028–FR-029 require that once status is terminal, further
  ticks leave the cave byte-for-byte unchanged. The cheapest way to
  guarantee that — and to make it trivially testable — is an early return in
  `tick()`: if `state.status !== 'inPlay'`, return `state` itself (no clone,
  no scan). Death is set the tick a falling body's cell-below-move lands on
  the kid; completion is set the tick the kid's move lands on an open door.
  Both are ordinary consequences of the same per-cell scan, not a separate
  end-of-tick check.
- **Alternatives considered**: A derived status computed from grid contents
  at read time (e.g., "is there still a player cell anywhere") (rejected —
  fragile, and FR-028 explicitly wants status as its own piece of state, not
  something inferred).

### Decision: The door's open/closed condition is derived from `collected >= quota`, not stored as a separate flag

- **Rationale**: FR-025 requires reaching the quota to be permanent, and
  this feature never decreases the collected count (collecting is the only
  operation on it, FR-017/FR-018). A monotonically non-decreasing counter
  compared against a fixed quota is already permanent once true — storing a
  second `doorOpen` boolean would just be a cache of that comparison with a
  chance to drift from it. `isDoorOpen(state)` (FR-043) is therefore a pure
  function of `collected` and `quota`, both already-required state.
- **Alternatives considered**: A stored boolean flipped once when the quota
  is first reached (rejected — adds a place the two facts could disagree,
  for no behavior the derived form doesn't already give; the derived form is
  simpler and exactly as fast, since it's one integer comparison per read).

### Decision: The `exit` element's tick behavior is looked up by content id exactly like `steelWall`, gated by `isDoorOpen`

- **Rationale**: FR-023/FR-024 require the closed door to behave and *look*
  exactly like a steel wall; FR-026 requires it to become enterable and
  visually distinct once open, and FR-008/edge-cases require that nothing
  ever rolls off it, open or closed. Reusing the existing "is this cell
  content in the non-roll, movement-blocking set" checks and simply special-
  casing `exit` in the player-movement branch (enterable only if
  `isDoorOpen`, ends the cave in the completed state) keeps the rule change
  contained to the one place feature 001 already branches on destination
  content, with no new element id and no separate "closed door" vs. "wall"
  identity to keep in sync.
- **Alternatives considered**: Introducing a `doorClosed`/`doorOpen` element
  id pair, converting one to the other on the grid at the moment the quota
  is met (rejected — the spec explicitly frames the closed door as
  *identical to a locker*, and swapping element ids at runtime would need a
  new "convert this cell" tick operation for a single cell that a plain
  comparison already covers for free, and would violate FR-039's ban on the
  simulation owning any animation phase if flashing were implemented via
  repeated id swaps).

### Decision: Grab is a boolean on `TickInput`, resolved as its own branch ahead of the normal move/push logic

- **Rationale**: FR-019–FR-021 describe grab as acting on the neighboring
  cell without moving the kid, for exactly two destination contents (dirt,
  diamond), and doing nothing for every other content including an eraser
  (explicitly never pushing). Checking `input.grab` first and returning
  after handling dirt/diamond/no-op — before the normal movement/push branch
  ever runs — keeps grab from being a modifier sprinkled through the push
  logic; it is structurally a different, simpler function over the same
  destination-cell inspection.
- **Alternatives considered**: Treating grab as "movement that gets undone"
  (i.e., run the normal move then move the kid back) (rejected — this would
  transiently occupy the destination cell with the player, which is exactly
  the moved-this-tick bookkeeping FR-019 says must not happen, and would
  make an eraser-adjacent grab look for a moment like a push).

### Decision: Theme gains three additive, purely-data fields: `doorOpenEntry`, `messages`, and `readout`

- **Rationale**: FR-038 requires the theme contract to express the door's
  open appearance, both terminal messages, and the readout wording, with no
  rendering-site branching. The existing `elements.exit` entry already
  covers the closed appearance (made identical to `elements.steelWall` by
  the Classroom theme's own data, checked by a test, not by code sharing a
  reference — the spec asks for indistinguishable appearance, not object
  identity). Three new top-level `Theme` fields — one `ThemeEntry` for the
  open door, a `{ dead: string; completed: string }` message pair, and a
  `{ label: string }` (or a single formattable template string) for the
  readout — are enough to remove every remaining literal from the renderer
  and the HUD.
- **Alternatives considered**: Overloading `elements.exit` to carry both
  appearances (rejected — `ThemeEntry` is a flat fill/glyph/label triple
  everywhere else; giving one element id a different shape than the other
  thirteen is exactly the kind of special case Principle III warns against).

### Decision: Door flashing is computed in `src/lib/render/canvas.ts` from `performance.now()`/the render loop's own frame time, never from tick count

- **Rationale**: FR-039 forbids the simulation from owning any animation
  phase. The render loop already runs its own `requestAnimationFrame` loop
  independent of the tick loop (feature 001, FR-023); computing a simple
  `Math.floor(now / FLASH_INTERVAL_MS) % 2` there and picking between
  `elements.exit` and `doorOpenEntry` only when `isDoorOpen(state)` is true
  keeps the flash rate independent of tick rate (so it doesn't change if the
  tick rate is ever tuned) and keeps the sim capable of running headless in
  `vitest` with zero timing dependency.
- **Alternatives considered**: Ticking a phase counter inside `CaveState`
  (rejected — explicitly forbidden by FR-039, and would make replay
  determinism depend on frame timing, which nothing in this feature should).

### Decision: The collected/quota readout renders through `getCollected`/`getQuota` every frame, formatting a theme-supplied template string

- **Rationale**: FR-041 requires the readout to read the sim through
  read-only accessors rather than tracking the count itself, and to source
  its wording from theme data. A theme field like
  `readout: { template: string }` with a placeholder (e.g. `"{count} / {quota} Gold Stars"`)
  keeps the readout itself free of any literal word, satisfying Principle
  III while staying a plain string substitution — no function value living
  in theme data, which would no longer be "data."
- **Alternatives considered**: A Svelte store mirroring the collected count
  (rejected — direct violation of FR-041's "rather than tracking them
  itself"; reading the accessor each render frame is simpler and cannot
  drift from sim state).

### Decision: Restart is a shell-level rebuild — re-run `parseCave` on the same `CaveDefinition` object — not a sim-level "reset" operation

- **Rationale**: FR-031/FR-032 require a restarted cave to be indistinguishable
  from a freshly loaded one, going back to the cave definition itself.
  `parseCave` already does exactly this deterministically (it re-seeds the
  PRNG from `def.seed` every time it's called, per feature 001). The
  restart key handler in `src/App.svelte` therefore just needs to call
  `parseCave(starterCave)` again and replace `caveState`, exactly mirroring
  how the cave is loaded the first time — no new sim entry point needed.
- **Alternatives considered**: A sim-exported `resetCave(state, def)` helper
  (rejected — `parseCave` is already that function; adding a second one
  with the same guarantees would be the "wall-clock time in two places"
  anti-pattern in reverse, two code paths that must be kept in sync for one
  behavior).

## Outstanding Unknowns

None. All Technical Context fields in `plan.md` are resolved by the
constitution, the spec's own Assumptions section, or the decisions above.
