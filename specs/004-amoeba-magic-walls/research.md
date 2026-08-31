# Phase 0 Research: Amoeba, Magic Wall, and Expanding Wall

The spec (`spec.md`) contains no `[NEEDS CLARIFICATION]` markers — all four
markers opened during drafting were resolved on the issue and folded into the
requirements themselves (see `checklists/requirements.md`). This document
records the implementation-pattern decisions needed to turn those resolved
rules into code over the existing feature-001/002/003 sim, plus one place
where the spec's prose (FR-006) and its own success criterion (SC-004) pull in
slightly different directions and a single implementation reading has to be
picked. That pick is called out below and repeated in the plan-stage issue
comment as a decision made without further clarification.

## Decisions

### Decision: Amoeba and expanding-wall growth are additional branches in the existing unified per-cell scan — no new `Grid` arrays

- **Rationale**: `tick()`'s main scan already dispatches by the *current*
  element id at each `(x, y)` it visits, in fixed top-to-bottom,
  left-to-right order, skipping any cell already marked moved this tick
  (features 001–003). Both amoeba growth (FR-004–FR-006) and expanding wall
  growth (FR-024–FR-026) are naturally "one thing this cell does on its own
  turn" rules with no state beyond "is this cell currently amoeba /
  expandingWall" — exactly the shape `stepEnemy` and `processBody` already
  have. Adding `else if (id === 'amoeba') growAmoeba(ctx, x, y)` and `else if
  (id === 'expandingWall') growExpandingWall(ctx, x, y)` to the same dispatch
  gets FR-004's "grid's existing fixed scan order" and FR-026's "cell created
  this tick cannot itself grow until the following tick" for free from the
  same moved-flag mechanism every other element already uses — a newly grown
  cell is marked moved by the same helper pattern `moveContent` uses, so if
  the scan reaches it later this tick it is skipped. Unlike feature 003, this
  feature adds **zero** new parallel typed arrays on `Grid`: amoeba and
  expanding wall need no per-cell state beyond the element id itself, and the
  magic wall's state is cave-wide, not per-cell (see next decision).
- **Alternatives considered**: A separate full-grid growth pass for amoeba
  and/or expanding wall, run before or after the main scan (rejected — this
  would need its own moved-flag bookkeeping to satisfy FR-005a/FR-026 and
  would duplicate machinery the main scan already provides for free; it would
  also break the natural, spec-required interaction where an amoeba cell and
  an expanding wall cell contesting the same empty neighbor are resolved by
  "whichever the fixed scan order reaches first," since two independent
  passes would need an explicit tie-break instead of inheriting one from scan
  position).

### Decision: Magic wall phase and countdown are two new scalar fields on `CaveState`, decremented by a cheap cave-wide pass before the main scan

- **Rationale**: FR-015 requires the phase to be "a single cave-wide value
  shared by every magic wall cell... with a single countdown," explicitly
  not per-cell. Two fields — `magicWallPhase: 'dormant' | 'active' | 'dead'`
  and `magicWallCountdown: number` — carried on `CaveState` exactly like
  `collected`/`quota`/`status` today, satisfy this directly and need no
  per-cell array at all. The countdown must "run on the cave's own tick
  counter" and "keep running while the cave is dying" (FR-019); a small
  pass — `if (phase === 'active') { countdown -= 1; if (countdown === 0)
  phase = 'dead'; }` — run once per tick before the main scan (alongside the
  existing `ageExplosions` pass) gives every tick of `active` life exactly
  one decrement regardless of whether a body converts that tick, and reaches
  `dead` on the documented tick without any per-cell scan. Placing it before
  the main scan means a tick whose countdown reaches zero has already
  flipped to `dead` by the time that same tick's falling bodies check the
  phase, which is what "MUST be dead from the tick the countdown reaches
  zero... a body falling in on that tick is not converted" (FR-019) requires.
  Activation (dormant → active) happens later, inside the main scan, at the
  moment a falling body first enters a wall cell — so on the activation tick
  itself the pre-scan pass sees `dormant` and no-ops, and the *following*
  tick's pre-scan pass makes the first real decrement, giving exactly
  `duration` ticks of conversion (activation tick plus `duration - 1` more)
  before the countdown reaches zero.
- **Alternatives considered**: Per-cell phase/countdown arrays parallel to
  `falling` (rejected — directly contradicts FR-015's "single cave-wide
  value... destroying some wall cells MUST NOT change the phase of the
  rest"); deriving "ticks since activation" from a stored activation-tick
  number instead of a live countdown (rejected — same objection feature
  003's research.md already raised for lazily-derived timing state: it
  reintroduces the exact bug class Principle II's "no time at read time"
  guards against, for no simplification since a stored countdown is already
  the simplest representation).

### Decision: Amoeba's collective conversion (FR-007–FR-009) is a read pass over the grid after the main scan, then a conditional write pass — no accumulator array

- **Rationale**: The size-limit and sealed checks need the amoeba's total
  cell count *and* whether any amoeba cell has an empty/dirt neighbor, both
  only knowable after growth attempts and any same-tick detonations
  (FR-011) have finished — i.e. after the main scan completes. A single
  linear scan over the grid (the same shape as the existing `hasAnyExplosion`
  helper) counts amoeba cells and tracks whether any has an eligible
  neighbor; if the count exceeds the cave's size limit, a second linear scan
  converts every remaining amoeba cell to `boulder`; otherwise, if no amoeba
  cell had an eligible neighbor and the count is nonzero, a second scan
  converts every remaining amoeba cell to `diamond` (FR-009: size limit
  checked first, at most one fires). Both scans are plain `for` loops over
  the typed array with no allocation, matching the constitution's
  allocation-free hot loop rule (Principle VI, SC-012) and the existing
  `ageExplosions`/`hasAnyExplosion` precedent of an unconditional full-grid
  pass every tick — a cave with zero amoeba cells finds the count is zero on
  the first pass and skips both the second scan and any PRNG draw (FR-010).
  Each cell the second pass converts is marked moved-this-tick, so a body
  created by the conversion does not also fall/roll on its creation tick
  (FR-009) — the exact pattern `ageExplosions` already uses for a gold star
  created by a blast.
- **Alternatives considered**: Collecting amoeba cell coordinates into an
  array while counting, to avoid a second full-grid scan on conversion
  (rejected — an array sized to the amoeba's cell count is a real per-tick
  allocation on every tick an amoeba exists, not just on a conversion tick;
  two allocation-free scans are simpler and keep the "no per-tick allocation
  growth" property unconditionally, at the cost of one more `O(width *
  height)` pass only on the ticks a cave actually has amoeba cells to find).

### Decision: A growth attempt always takes exactly one direction draw on success, regardless of how many neighbors are eligible

- **Rationale**: FR-006 says a successful attempt's target, "where more than
  one orthogonal neighbour is eligible," is chosen by "one further draw...
  taken only on a successful attempt." Read in isolation this leaves room
  for "no draw needed when exactly one neighbor is eligible." But SC-004 is
  more specific and is the success criterion this feature is graded against:
  "A growth pass takes one growth draw per amoeba cell present at its start,
  in 100% of ticks... **plus one direction draw per successful attempt, and
  nothing else**." That line admits no exception for a successful attempt
  with zero or one eligible neighbor. This plan follows SC-004 as the
  authoritative statement and always takes a direction draw on a successful
  attempt: build the eligible-neighbor list by checking `up, down, left,
  right` (the same fixed order `stepEnemy` already uses) against `empty`/
  `dirt`; draw one float from the generator; if the list is nonempty, `index
  = floor(draw * list.length)` selects the target; if the list is empty (a
  successful attempt with nowhere to grow), the draw is still consumed but
  nothing changes on the grid. This keeps the per-tick draw count a pure,
  branch-free function of "how many amoeba cells existed" plus "how many
  attempts succeeded," exactly as FR-005a/SC-004 require, and is simpler to
  implement and to test than a rule whose draw count also depends on local
  grid geometry. **This is a decision made without further clarification**
  — the spec text has no clarification marker here, but its own two
  statements point in slightly different directions, and this plan resolves
  the tension in favor of the numbered success criterion.
- **Alternatives considered**: Skipping the direction draw when 0 or 1
  neighbors are eligible (rejected — contradicts SC-004's literal "one
  direction draw per successful attempt, and nothing else," and would make
  the tick's draw count depend on the amoeba's shape as well as its size,
  which is harder to state as a clean invariant and harder to test for
  FR-039's "identical across two runs of the same seed" case).

### Decision: A cell destroyed earlier in the same tick's scan takes no growth/countdown action on its own turn — dispatch always keys off the cell's *current* id

- **Rationale**: A falling body can detonate an amoeba cell directly below it
  (FR-011) before that amoeba cell's own turn arrives later in the same
  top-to-bottom scan (the amoeba cell is always one row below the body, i.e.
  strictly later in scan order). Feature 003 already established this exact
  rule for an enemy destroyed by a blast earlier in the same tick: the main
  scan's dispatch reads whatever element id currently occupies a cell at the
  moment it visits that cell, not a snapshot taken at the tick's start, so a
  cell already turned to `explosion` simply matches no dispatch branch and
  is skipped. Reusing that rule for amoeba (rather than a special "was this
  cell present at the very start of the tick" check) keeps growth attempts
  perfectly consistent with how every other element already handles
  mid-tick destruction, and satisfies FR-005a's real intent — never skip a
  *surviving* cell's draw as an optimization — without over-reading it as a
  requirement to draw for a cell that no longer exists.
- **Alternatives considered**: Snapshotting the set of amoeba cells at the
  start of the tick and iterating that snapshot for growth attempts
  regardless of what happens to a cell mid-scan (rejected — this needs an
  extra allocation and a second traversal order independent of grid position,
  and produces a different, harder-to-justify answer to "does a cell
  detonated mid-tick still owe a draw" than the rest of the codebase gives
  for the exact same situation with enemies).

### Decision: Magic wall conversion destination is found by walking down through the unbroken run of wall cells at the moment of entry

- **Rationale**: FR-018 places the converted body "in the first cell below
  the unbroken vertical run of magic wall cells" beneath the entry point.
  Starting at the cell directly below the body's original position (which is
  the wall cell it entered) and walking `y + 1, y + 2, ...` while each cell's
  current content is `magicWall`, then stopping at the first non-`magicWall`
  cell, reads the *current* grid — so a wall partially destroyed by a blast
  (edge case: "a blast destroys some of the wall's cells") naturally breaks
  the run at the hole with no special-casing, and a wall several cells thick
  naturally sends the body out the bottom in one tick (FR-018's "thickness
  changes nothing else"). If that stopping cell is off-grid or not `empty`,
  FR-018a applies: the body is destroyed, nothing emerges, and the wall
  still activates/keeps its countdown running, all decided before this walk
  even starts (activation is unconditional on entry; the walk only decides
  what happens to the body).
- **Alternatives considered**: Storing wall "thickness" as cave data instead
  of deriving it from the live grid (rejected — the edge case above requires
  the run to reflect live destruction, so a static thickness value would
  need to be kept in sync with every blast that touches a wall cell for no
  benefit over just walking the grid, which is already O(wall thickness),
  not O(grid size)).

### Decision: The three new obstacles join the existing wall-block check in `movePlayer`; push and grab need no new code

- **Rationale**: FR-002/FR-014/FR-023 all require the kid to be blocked from
  moving into amoeba, magic wall, and expanding wall cells, exactly like a
  brick wall. `movePlayer`'s existing `if (destId === 'brickWall' || destId
  === 'steelWall') return;` line already is that exact "refuse the move, do
  nothing else" behavior; naming the three new ids alongside it is the
  entire change (FR-014's "blocks movement exactly as a brick wall does" is
  satisfied identically to how it already reads for brick/steel). Push
  (`resolvePush`) already requires the cell *beyond* a pushed boulder to be
  `empty` before it touches the generator — since none of the three new
  elements is ever `empty`, a push whose beyond-cell holds one of them is
  already ineligible today, satisfying the edge case ("a body is pushed
  sideways into a wall cell: the push fails") with no new code. Grab
  (`resolveGrab`) already only special-cases `dirt` and `diamond` and leaves
  every other content untouched, satisfying "cannot be dug or grabbed" for
  all three with no new code either.
- **Alternatives considered**: A shared "is this an obstacle" predicate
  function used by movement, push, and grab alike (rejected — push and grab
  already get the right behavior for free from their existing eligibility
  checks; adding a predicate they'd each call redundantly is more code for
  the same outcome, and the constitution favors not designing for
  hypothetical future obstacle types this feature does not need).

### Decision: The magic wall's "running" look is one more theme field, parallel to `doorOpenEntry`; `resolveEntry` gains one more branch keyed only on the new read-only phase accessor

- **Rationale**: FR-033/FR-034 require an active wall to look different from
  an inert (dormant-or-dead) one, using "a new theme field, following the
  existing pattern for the open door." `Theme.doorOpenEntry` is exactly that
  pattern: a second `ThemeEntry` alongside `elements.exit`, selected by
  `canvas.ts`'s `resolveEntry` based on live state, never by branching on
  theme identity. Adding `Theme.magicWallActiveEntry: ThemeEntry` and one
  more `resolveEntry` branch — `if (elementId === 'magicWall' &&
  getMagicWallPhase(state) === 'active') return theme.magicWallActiveEntry;`
  — reuses the identical mechanism. `elements.magicWall` itself becomes the
  one inert entry FR-034 requires (covering both dormant and dead), so the
  theme carries exactly two magic wall entries as required, and the
  renderer's only phase-shaped decision is that one boolean check — it never
  reads or exposes dormant vs. dead (FR-034a).
- **Alternatives considered**: A three-entry theme shape (dormant/active/
  dead) (rejected — FR-034 explicitly requires exactly two entries, since a
  third entry would let a themer accidentally make dormant and dead look
  different, defeating the mechanic); branching on theme id inside
  `resolveEntry` (rejected — forbidden by Principle III and FR-033
  explicitly).

## Outstanding Unknowns

None. All Technical Context fields in `plan.md` are resolved by the
constitution, the spec's own Assumptions section, or the decisions above. The
one genuine tension found while researching (FR-006 vs. SC-004 on direction
draws) is resolved above and is reported as a decision made without further
clarification.
