# Feature Specification: Amoeba, Magic Wall, and Expanding Wall

**Feature Branch**: `spec-draft/004-amoeba-magic-walls`

**Created**: 2026-08-30

**Status**: Draft

**Input**: GitHub issue #4 — "Amoeba, magic wall, and expanding wall": the last
three elements of the declared set, and the two most interesting decisions in
the game. Plus the clarification reply on the same issue, settling the amoeba's
growth rate as a per-cell probability, the fate of a body converted with no room
below the wall, and the Classroom name for the magic wall.

The cave stops being a static puzzle and starts pushing back. A blob of spilled
glue creeps through the notebook paper, eating the room a player was counting
on. Seal it in and the whole blob turns to gold stars; let it run and it turns
to erasers instead — and by then it has taken the route. A stretch of wall runs
for a few seconds after the first thing falls through it, turning erasers into
gold stars on the way down, once per cave and never again. And a wall that
grows sideways closes routes behind a player who dithers.

Every other element in this game is something a player acts on. These three act
back, on a clock the player does not control, which is what makes both of the
decisions here — when to seal the glue, and what to feed the wall while it runs
— worth making.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The glue spreads, and the player decides when to seal it (Priority: P1)

A blob of spilled glue sits in the paper. Left alone it creeps outward, eating
paper and open floor at a rate the player can feel but not predict cell-by-cell
— and every cell it gains is another cell taking its own chance to spread, so a
blob left alone gets faster the bigger it is. It is on a timer the player cannot
see: wall it in with
erasers and dirt before it gets big and the whole blob turns to gold stars — the
single biggest payout in the game. Let it grow past its limit and it turns to
erasers instead, which is not a punishment so much as a consolation prize
delivered on top of the route it just ate.

**Why this priority**: This is the feature's centre of gravity and the first
element in the game that changes the cave without the player touching it. It is
also the source of the game's most interesting decision: a growing amoeba is
worth more the longer you wait and worth nothing if you wait too long.

**Independent Test**: Load a small cave with a blob of glue surrounded by paper
and open floor, run a fixed number of ticks with no input, and confirm the blob
has grown into both paper and floor and nowhere else. Then run a cave where the
blob is sealed on every side and confirm it becomes gold stars; then one where
it is given room past its limit and confirm it becomes erasers. Run each cave
twice from the same seed and confirm the two runs are identical grid for grid.

**Acceptance Scenarios**:

1. **Given** a blob of glue with notebook paper and empty floor beside it,
   **When** enough ticks run, **Then** it has grown into cells of both kinds and
   into no other kind of cell.
2. **Given** a blob of glue whose only neighbours are erasers, walls, gold
   stars, and the kid, **When** ticks run, **Then** it never grows into any of
   them and the kid is never harmed by standing beside it.
3. **Given** a blob of glue with no empty or paper cell anywhere beside it,
   **When** the tick's growth pass finishes, **Then** every cell of the blob
   becomes a gold star on that tick.
4. **Given** a blob of glue that grows past the cave's size limit, **When** the
   tick's growth pass finishes, **Then** every cell of the blob becomes an
   eraser on that tick.
5. **Given** the same cave, seed, and input sequence, **When** it is run twice,
   **Then** both runs produce identical grids at every tick, glue included.
6. **Given** a falling eraser directly above a cell of glue, **When** the tick
   runs, **Then** the glue detonates.
7. **Given** a blob of glue that has already turned to gold stars or erasers,
   **When** further ticks run, **Then** nothing of it grows again — it is gone
   from the cave for good.

---

### User Story 2 - Feed the wall while it runs (Priority: P1)

A stretch of wall sits inert until the first eraser or gold star falls into it.
From that moment it runs for a few seconds: anything falling in comes out
underneath as its opposite — erasers become gold stars, gold stars become
erasers — and then it stops, for the rest of the cave, forever. A player who has
set up a stack of erasers above it before triggering it can convert the lot; a
player who triggers it by accident has spent it.

**Why this priority**: It is the game's second real decision and the only
irreversible resource in the cave. It is independently testable and independently
valuable: a cave with a magic wall and a pile of erasers is a complete puzzle on
its own.

**Independent Test**: Drop an eraser into a wall and confirm a gold star lands
below it; drop a gold star in and confirm an eraser lands below. Run the wall
past its duration and confirm the next thing dropped in simply stops on top of
it. Drop an eraser into an active wall with no room underneath and confirm the
eraser is simply gone. Load a cave whose wall is never triggered and confirm it
behaves as solid wall for the entire cave.

**Acceptance Scenarios**:

1. **Given** a dormant wall and a falling eraser directly above it, **When** the
   tick runs, **Then** the wall becomes active and a falling gold star emerges
   from the cell below the wall.
2. **Given** an active wall and a falling gold star, **When** it falls in,
   **Then** a falling eraser emerges below the wall.
3. **Given** an active wall, **When** its duration elapses, **Then** it is dead
   for the rest of the cave and nothing reactivates it.
4. **Given** a dead wall and a falling eraser above it, **When** ticks run,
   **Then** the eraser stops on top of the wall and stays an eraser.
5. **Given** a wall that is never fallen into, **When** the whole cave is
   played, **Then** it behaves exactly as a solid wall from first tick to last.
6. **Given** the kid walking into a wall cell in any of the three phases,
   **When** the move is attempted, **Then** it is refused.
7. **Given** a cave restarted after its wall ran out, **When** the fresh cave
   loads, **Then** the wall is dormant again.
8. **Given** an active wall whose cell below is occupied, **When** a falling
   eraser falls into it, **Then** the eraser is destroyed, nothing emerges
   below, and the wall's countdown keeps running.

---

### User Story 3 - The bookshelf closes the route behind you (Priority: P2)

A stretch of wall grows sideways into any open floor beside it, a cell per tick,
in both directions. A player who tunnels past it and dawdles finds the way back
gone. It never eats paper, never crushes anything, and never grows up or down —
it just quietly takes the empty space.

**Why this priority**: It is the simplest of the three rules and the one that
makes a cave feel timed without a timer, but nothing else in this feature
depends on it, so it can land last.

**Independent Test**: Put a single expanding wall cell in the middle of an open
corridor, run a handful of ticks, and confirm it has grown exactly one cell per
tick in each direction and stopped dead against the obstruction at each end.

**Acceptance Scenarios**:

1. **Given** an expanding wall cell with empty floor on both sides, **When** one
   tick runs, **Then** exactly one new wall cell exists on each side.
2. **Given** an expanding wall cell with notebook paper beside it, **When** ticks
   run, **Then** it never grows into the paper.
3. **Given** an expanding wall filling a corridor, **When** its growth reaches a
   wall, an eraser, the kid, or the grid edge, **Then** it stops there and never
   displaces anything.
4. **Given** an expanding wall cell, **When** one tick runs, **Then** the cells
   it created that tick do not themselves grow until the following tick.
5. **Given** an expanding wall and an empty cell above or below it, **When**
   ticks run, **Then** it never grows vertically.

---

### Edge Cases

**The glue**

- **The glue is momentarily sealed by something passing**: an eraser falling
  past the last gap seals the blob for that tick, and the blob converts to gold
  stars on that tick. The check is instantaneous by design — it is the same
  trick players have always used to cash a blob early, and making it require
  sustained enclosure would turn a legible rule into a hidden timer.
- **The glue is both over its size limit and sealed on the same tick**: the size
  limit wins and it becomes erasers. One rule has to be checked first; the size
  limit is checked first so a player cannot rescue an overgrown blob by sealing
  it in the same instant it tips over the limit.
- **The kid stands next to the glue**: nothing happens. The glue cannot enter an
  occupied cell, so it never grows into the kid, and touching it is harmless.
- **The kid is fully surrounded by glue**: the kid is stuck, not dead. Being
  walled in is a losing position the player must restart out of, exactly as
  being walled in by boulders already is.
- **The glue grows into the cell a falling eraser is about to enter**: whichever
  the fixed scan order reaches first takes the cell; the other finds it occupied
  and does the ordinary thing. No cell is ever contested.
- **Two separate blobs of glue in one cave**: they are one amoeba for the
  purposes of the size limit and the sealed check. Two blobs seal only when
  neither has anywhere to grow, and they convert together.
- **A blast covers part of the glue**: those cells are destroyed like any other
  destructible content, and the rest of the blob carries on growing. Glue does
  not chain-detonate the way an enemy does.
- **A blast destroys the last cell of glue**: the cave simply has no amoeba any
  more. No conversion fires, since there is nothing to convert.
- **A cave with no glue at all**: no growth pass, no random draws, no cost.
- **The glue turns to erasers directly above the kid**: those erasers are not
  falling on the tick they appear, so they do not crush the kid on that tick.
  They fall by the ordinary rule from the next tick on, and then they are as
  lethal as any other falling eraser.

**The wall that converts**

- **Two things fall into the wall on the same tick**: both convert, each
  emerging below its own column, resolved in the fixed scan order.
- **The wall is active but the cell below it is blocked**: the body is destroyed
  (FR-018a). It went in and nothing came out. The wall still spends the tick,
  and a player who drops an eraser into a wall with no room underneath has lost
  the eraser.
- **The wall is several cells thick**: a body falling into the top comes out
  below the bottom of that unbroken vertical run of wall cells. Thickness
  changes nothing else.
- **The wall is at the bottom edge of the grid**: there is no cell below it, so
  the same rule as a blocked cell below applies (FR-018a) — the body is
  destroyed.
- **A body is pushed sideways into a wall cell**: the push fails, because the
  cell beyond the eraser is not empty. Only falling bodies from directly above
  are converted — a pushed eraser is not falling and never enters the wall.
- **A body is resting on a dormant wall and the support under it is dug away**
  — it was never falling into the wall, it was already on it, so it stays put
  and never triggers anything.
- **A body falls into the wall on the very tick the wall dies**: the wall is
  dead for that tick, so the body stops on top of it. The boundary is stated in
  ticks precisely so this case is decidable rather than a coin flip.
- **The wall converts a body into the cave's last needed gold star**: it counts
  toward quota like any other once collected. The wall pays out stars, not
  quota — a converted star still has to be picked up.
- **A blast destroys some of the wall's cells**: the surviving cells keep the
  cave's shared phase and timer. The phase belongs to the cave, not to any one
  cell.

**The wall that grows**

- **The expanding wall reaches the kid**: it stops beside them. It never enters
  an occupied cell and never crushes.
- **The expanding wall walls the kid into a pocket**: legal, and a real way to
  lose a cave. Restart is one key away.
- **The expanding wall and the glue want the same empty cell**: scan order
  decides, deterministically. Both are ordinary contenders for empty space.
- **An expanding wall cell is created next to another expanding wall cell**:
  nothing special — each cell only ever looks at its own two horizontal
  neighbours.
- **A blast destroys part of an expanding wall**: the hole is real, and the
  surviving cells grow back into it on the following ticks.
- **An expanding wall in a fully-walled pocket**: it fills the pocket and then
  does nothing forever. Not a stall, just a wall.

**Everything else**

- **A cave with none of the three elements**: identical behavior to today, and
  no new random draws, so every existing replay still holds.
- **Any of the three is caught in a blast**: destroyed, exactly as feature 003
  already specifies for these elements. Nothing here makes them blast-proof.
- **The cave is dying (the kid is dead but blasts are still resolving)**: the
  glue keeps growing, the wall keeps its countdown, and the expanding wall keeps
  growing, exactly as enemies keep patrolling. The dying state stops input and
  the win condition, nothing else.

## Requirements *(mandatory)*

### The amoeba (Classroom: spilled glue)

- **FR-001**: The `amoeba` element declared by feature 001 MUST gain behavior.
  It occupies one cell, is part of cave state, never falls, is never pushed, is
  never collectible, cannot be dug or grabbed, and MUST NOT be a roll surface —
  a body resting on it stays put, as feature 002 already specifies.
- **FR-002**: The kid MUST NOT be able to move into a cell holding amoeba, and
  amoeba contact MUST NOT harm the kid. Amoeba is an obstacle, not a hazard.
- **FR-003**: Every amoeba cell in a cave MUST be treated as one collective for
  the size limit (FR-007) and the sealed check (FR-008), whether or not the
  cells are connected. Disconnected blobs live and die together.
- **FR-004**: On each tick, each amoeba cell present at the start of that tick's
  growth pass MUST get exactly one growth attempt, taken in the grid's existing
  fixed scan order.
- **FR-005**: A growth attempt MUST consume the simulation's seeded generator
  and MUST succeed with the cave's **amoeba growth rate**, expressed as a
  **per-cell, per-tick probability**. Each amoeba cell draws independently, so a
  larger blob spreads faster and growth accelerates as the blob grows.
- **FR-005a**: Every amoeba cell present at the start of the growth pass MUST
  take **exactly one growth draw**, in the grid's fixed scan order, whether or
  not that cell has anywhere to grow. The pass MUST NOT exit early once some
  cell has grown, MUST NOT skip a cell whose orthogonal neighbours are all
  blocked, and MUST NOT visit the cells in any order but the grid's. The draws
  taken on a tick are therefore a pure function of the grid's contents and the
  generator's state, never of wall-clock time or of iteration-order differences,
  and the run stays replayable. Skipping a draw that cannot change the grid is a
  determinism bug, not an optimization, and FR-039's same-seed case exists to
  catch it.
- **FR-006**: A successful growth attempt MUST turn exactly one orthogonally
  adjacent cell into amoeba, and only if that cell holds **empty space or
  dirt**. Every other content — bodies, either wall, the door, the kid, an
  enemy, an explosion, another amoeba cell, the magic wall, the expanding wall,
  and the grid boundary — MUST block growth. Where more than one orthogonal
  neighbour is eligible, the target MUST be chosen by **one further draw** from
  the same generator over that cell's eligible neighbours in a fixed direction
  order, taken only on a successful attempt — so the draws a tick takes are
  still settled entirely by the cave, the seed, and the inputs. A cell created
  by growth MUST be marked as having acted this tick, so it cannot itself grow
  until the following tick.
- **FR-007**: At the end of each tick's growth pass, if the number of amoeba
  cells in the cave **exceeds** the cave's amoeba size limit, every amoeba cell
  MUST become a **boulder** on that tick.
- **FR-008**: Otherwise, if no amoeba cell has an orthogonally adjacent cell
  holding empty space or dirt, every amoeba cell MUST become a **diamond** on
  that tick. The check is instantaneous — it MUST NOT require the blob to have
  been sealed for more than the tick on which it is evaluated.
- **FR-009**: FR-007 MUST be evaluated before FR-008, and at most one of them
  MUST fire on any tick. Cells converted by either MUST be marked as having
  acted this tick, so a diamond or boulder created by the conversion MUST NOT
  also fall or roll on the tick it appears — it begins falling on a later tick
  by the ordinary rule.
- **FR-010**: Once converted, the amoeba is gone from the cave. A cave with zero
  amoeba cells MUST run no growth pass, MUST evaluate neither FR-007 nor FR-008,
  and MUST draw no randomness.
- **FR-011**: A **falling** boulder or diamond whose cell directly below holds
  amoeba MUST detonate — stamping the same 3x3 blast feature 003 defines,
  centered on the amoeba cell, leaving **empty space**, with the falling body
  consumed by the blast exactly as it is when it lands on an enemy. A body that
  is not falling MUST NOT detonate the amoeba.
- **FR-012**: An amoeba cell caught in a blast MUST be destroyed like any other
  destructible content and MUST NOT queue a blast of its own — amoeba does not
  chain the way an enemy does.

### The magic wall (Classroom: see FR-032)

- **FR-013**: The `magicWall` element MUST gain behavior. It never falls, is
  never pushed, is never destroyed by anything but a blast, cannot be dug,
  grabbed, or collected, and MUST NOT be a roll surface in any phase.
- **FR-014**: The kid MUST NOT be able to move into a magic wall cell in any
  phase. In all three phases the wall blocks movement exactly as a brick wall
  does.
- **FR-015**: The magic wall's phase — **dormant**, **active**, or **dead** —
  MUST be a single cave-wide value shared by every magic wall cell in the cave,
  with a single countdown. Destroying some wall cells MUST NOT change the phase
  of the rest.
- **FR-016**: The phase MUST begin **dormant** and MUST advance only as follows:
  dormant → active on the tick a falling boulder or diamond first falls into a
  magic wall cell (FR-017); active → dead when the countdown expires (FR-019).
  Dead is permanent for that cave; nothing MUST reactivate it. A cave restart
  re-parses the cave and therefore begins dormant again.
- **FR-017**: A **falling** boulder or diamond directly above a magic wall cell
  is what falls into the wall. While the phase is dormant, that body MUST
  activate the wall and MUST itself be converted on that same tick. While the
  phase is active, that body MUST be converted. A body that is not falling MUST
  never enter, convert, or activate anything.
- **FR-018**: Converting a body MUST: remove it from the cell above the wall;
  turn a boulder into a **diamond** and a diamond into a **boulder**; and place
  the result in the first cell **below the unbroken vertical run of magic wall
  cells** beneath it, marked as falling and as having acted this tick, so it
  continues falling from the next tick by the ordinary rule. The body MUST never
  occupy a magic wall cell itself.
- **FR-018a**: If that destination cell is off the grid or holds anything other
  than empty space, the converted body MUST be **destroyed**: it is removed from
  the cell above the wall, nothing emerges below, and no blast, sound, or other
  effect is produced. The wall MUST still activate if it was dormant, and its
  countdown MUST run as normal — the drop costs the player the body. A body goes
  into the wall and nothing comes out; the wall is a gamble, and what sits under
  it is part of the cave's design.
- **FR-019**: Activation MUST set the countdown to the cave's **magic wall
  duration**, measured in ticks. The wall MUST convert on the activation tick
  and on each of the following (duration − 1) ticks, and MUST be dead from the
  tick the countdown reaches zero — so a body falling in on that tick is not
  converted. The countdown MUST run on the cave's own tick counter, never on
  wall-clock time, and MUST keep running while the cave is dying.
- **FR-020**: A dead or dormant magic wall MUST stop a falling body on top of it
  like any solid wall — the body comes to rest in the cell above and stays
  whatever it was — except for the dormant-wall activation of FR-017.
- **FR-021**: Magic wall behavior MUST consume no randomness. The phase, the
  countdown, and every conversion are pure functions of the cave and the tick.
- **FR-022**: A diamond produced by a conversion MUST count toward the cave's
  quota when collected, exactly like any other diamond. Conversion produces
  diamonds, not quota.

### The expanding wall (Classroom: bookshelf)

- **FR-023**: The `expandingWall` element MUST gain behavior. It never falls, is
  never pushed, cannot be dug, grabbed, or collected, MUST NOT be a roll
  surface, and MUST block the kid's movement exactly as a brick wall does.
- **FR-024**: On each tick, each expanding wall cell present at the start of
  that tick's pass MUST turn the cell immediately to its **left** into expanding
  wall if that cell holds empty space, and the cell immediately to its **right**
  into expanding wall if that cell holds empty space. Both MAY happen on the
  same tick.
- **FR-025**: Growth MUST be into **empty space only**. Dirt, bodies, either
  wall, the door, the kid, an enemy, an explosion, amoeba, the magic wall,
  another expanding wall cell, and the grid boundary MUST all stop it. Growth
  MUST never destroy, displace, crush, or harm anything, and MUST never be
  vertical or diagonal.
- **FR-026**: A cell created by expanding wall growth MUST be marked as having
  acted this tick, so growth is exactly one cell per side per tick and cannot
  run across a corridor within a single tick.
- **FR-027**: Expanding wall growth MUST consume no randomness and MUST run on
  every tick, with no cadence and no per-cave rate.

### Cave data and parameters

- **FR-028**: A cave definition MUST gain three optional parameters:
  **amoeba growth rate** (a per-cell, per-tick probability, per FR-005),
  **amoeba size limit** (a cell count), and
  **magic wall duration** (in ticks). All three MUST have documented defaults so
  that every existing cave and test loads unchanged, and each MUST be settable
  per cave without touching any other cave.
- **FR-029**: Parsing MUST reject a cave whose amoeba size limit or magic wall
  duration is not a positive whole number, or whose growth rate is not a
  probability greater than zero and at most one, naming the cave and the
  offending value and producing no partial grid — the same failure discipline
  parsing already uses.
- **FR-030**: The three elements MUST be placeable in cave data as the ASCII
  characters that already map to them. Adding, moving, or removing one MUST NOT
  touch any simulation file.
- **FR-031**: The shipped cave MUST gain at least one amoeba, one magic wall,
  and one expanding wall, placed so that: the cave remains winnable without
  using any of them; the amoeba cannot reach the kid's spawn or seal the route
  to the door before a player of ordinary speed can pass; the magic wall has an
  eraser a player can plausibly drop into it; and nothing kills or traps the kid
  at tick zero. The cave's parameters MUST be set explicitly rather than left to
  the defaults, so the shipped cave documents what the dials do.

### Rendering and themes

- **FR-032**: The Classroom theme MUST carry a label, glyph, and color for all
  three elements that read at the shipped cell size and are distinguishable from
  each other and from every other element. The shipped labels are **Spilled
  Glue** (amoeba), **Sticker Machine** (magic wall), and **Bookshelf**
  (expanding wall). The originating request describes the magic wall as a pencil
  sharpener, but "Pencil Sharpener" is the firefly's Classroom name as of
  feature 003 and MUST keep it; the magic wall takes "Sticker Machine" instead —
  a machine that eats erasers and dispenses gold star stickers carries the same
  image, is one line of theme data, and re-settles none of feature 003's names.
- **FR-033**: An **active** magic wall MUST be visually distinguishable from a
  dormant or dead one, so a player can see the clock running. That distinction
  MUST come from a new theme field — following the existing pattern for the open
  door, which is a separate theme entry rather than a branch in drawing logic.
  Drawing logic MUST NOT branch on which theme is active, and MUST NOT hardcode
  any appearance.
- **FR-034**: A dormant magic wall and a dead one MUST be drawn identically. A
  player MUST NOT be able to tell from the wall alone whether it has already been
  spent — that uncertainty is part of the decision the wall exists to create.
  [NEEDS CLARIFICATION: the clarification reply's aside on FR-032 asks that
  dormant and spent be distinguishable, "since a player has to be able to tell
  'not started yet' from 'already used up'", which contradicts this requirement
  and the assumption behind it. Which stands? (a) keep FR-034 — dormant and dead
  are drawn identically, the theme carries two magic wall entries (inert and
  active), and the suspense is the point; (b) drop FR-034 — the theme carries
  three entries (dormant, active, spent), FR-036's read-only phase accessor
  already exposes all three, and the maintainer-verified criterion about a
  dormant and a dead wall being indistinguishable is removed. Either way the
  appearance stays theme data and the renderer MUST NOT branch on phase itself
  beyond selecting the theme entry the accessor names.]
- **FR-035**: Adding a further theme MUST still require only a new entry in the
  theme registry, these three elements and the active-wall field included, with
  no simulation and no drawing-logic change.

### Read-only access, purity, and determinism

- **FR-036**: The simulation MUST expose the magic wall's current phase as a
  read-only accessor, in the same style as the existing accessors, for the
  renderer's use under FR-033. Nothing outside the simulation may write it, and
  the shell MUST NOT track the phase itself.
- **FR-037**: The simulation MUST still contain no wall-clock time, no page or
  browser access, and no randomness other than its own seeded generator. Amoeba
  growth becomes that generator's **second** consumer alongside push resolution;
  the draws MUST be taken in a fixed, documented order within the tick so that
  the same cave, seed, and inputs replay identically. Caves with no amoeba MUST
  take no additional draws and therefore MUST replay exactly as they do today.

### Tests

- **FR-038**: Every rule above that changes the grid MUST be pinned by an ASCII
  cave test — a starting grid, a tick count and optional per-tick inputs, and
  the expected grid — with readable side-by-side ASCII on failure, using the
  existing harness.
- **FR-039**: The suite MUST cover, at minimum, each of the following as its own
  case:
  - amoeba growing into dirt, and into empty space, over a fixed tick count;
  - amoeba refusing to grow into a body, a wall, the door, the kid, an enemy,
    an explosion, and off the grid edge;
  - an enclosed amoeba turning entirely to diamonds on the expected tick;
  - an amoeba grown past its size limit turning entirely to boulders on the
    expected tick;
  - the precedence of FR-009: an amoeba that is over its limit and sealed on the
    same tick becomes boulders;
  - a diamond or boulder created by an amoeba conversion not moving on the tick
    it appears, then falling normally afterwards;
  - amoeba growth being identical across two runs of the same cave and seed, and
    differing between two different seeds, over enough ticks for a drift of one
    draw to show;
  - a fully enclosed blob still taking its one growth draw per cell (FR-005a),
    pinned by a cave in which a push later in the same run resolves identically
    whether the blob had anywhere to grow or not;
  - a larger blob growing faster than a smaller one at the same rate (FR-005),
    pinning that the probability is per cell and not per blob;
  - two disconnected blobs converting together as one collective;
  - a falling eraser detonating amoeba, and a resting one detonating nothing
    over many ticks;
  - amoeba destroyed by a blast without chaining;
  - a magic wall converting a falling boulder to a diamond, and a falling
    diamond to a boulder, each emerging below the wall and continuing to fall;
  - a magic wall activating on the first body to fall in, with that same body
    converted;
  - a magic wall expiring on the documented tick, and the next body falling in
    stopping on top of it unchanged;
  - a magic wall that is never activated behaving as solid wall for a long run;
  - the blocked-destination case (FR-018a): a body falling into an active wall
    whose destination cell is occupied, and one falling into a wall on the
    bottom row, each destroyed with nothing emerging and the countdown running
    on;
  - a magic wall two or more cells thick, with the body emerging below the run;
  - two bodies converting on the same tick in different columns;
  - the kid being blocked by a magic wall in each of its three phases;
  - an expanding wall filling a gap one cell per tick in each direction and
    stopping at an obstruction;
  - an expanding wall refusing to grow into dirt and refusing to grow
    vertically;
  - a cell created by expanding wall growth not growing again until the next
    tick;
  - a full replay: the same cave, seed, and ordered inputs producing an
    identical grid, collected count, and status after a run that includes amoeba
    growth, a magic wall conversion, and expanding wall growth.
- **FR-040**: The suite MUST continue to run with no browser, canvas, audio
  device, or browser-automation tooling.

### Non-regression

- **FR-041**: Every rule and test from features 001, 002, and 003 MUST still
  hold, with one stated exception: feature 002's inert-element rule (a body
  rests on amoeba, magic wall, and expanding wall without rolling, and nothing
  else happens) is superseded **only** in the respects this spec names — the
  three elements gain the behavior specified here. The "no rolling off them"
  half of that rule is deliberately retained (FR-001, FR-013, FR-023). Where an
  earlier test pins the inert behavior of one of these three, it MUST be updated
  to the rule stated here, not deleted or weakened.
- **FR-042**: Feature 003's statement that the simulation has exactly one
  consumer of the seeded generator is amended by FR-037: amoeba growth is the
  second. Every existing replay and determinism test MUST still pass unchanged,
  because they use caves with no amoeba.
- **FR-043**: Determinism MUST extend to everything added here: the same cave,
  seed, and ordered inputs MUST produce an identical grid, collected count,
  status, amoeba extent, magic wall phase and countdown, and expanding wall
  extent after any number of ticks.

### Key Entities

- **Amoeba collective**: Every amoeba cell in the cave, treated as one thing for
  the size limit and the sealed check. Its size is a count of cells; its fate is
  gold stars, erasers, or destruction by a blast.
- **Growth attempt**: One amoeba cell's one chance per tick to spread, resolved
  against the seeded generator. The unit that makes growth random but
  replayable.
- **Amoeba growth rate**: The per-cave dial that decides how fast the blob
  spreads. The cave's main lever for how much pressure the amoeba applies.
- **Amoeba size limit**: The per-cave cell count above which the blob turns to
  erasers instead of gold stars. Together with the growth rate it sets how long
  a player has to make the decision.
- **Magic wall phase**: Dormant, active, or dead — one value for the whole cave,
  advancing in one direction only, reset only by restarting the cave.
- **Magic wall countdown**: Ticks of active life remaining. Starts at the cave's
  duration on activation, runs to zero, never restarts.
- **Conversion**: One falling body swapped for its opposite and placed below the
  wall, still falling. The wall's entire output.
- **Expanding wall growth**: One cell per side per tick into empty space. No
  rate, no randomness, no cadence — the one thing in this feature that is
  perfectly predictable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Amoeba grows only into empty space and dirt, in 100% of runs, over
  a run of at least 100 ticks against a cave containing every other element as a
  neighbour.
- **SC-002**: A sealed amoeba becomes diamonds on the tick it is sealed, in 100%
  of attempts, and every one of its cells converts on that same tick.
- **SC-003**: An amoeba that exceeds its size limit becomes boulders on that
  tick, in 100% of attempts, with the cell count that triggered it exactly one
  above the limit.
- **SC-004**: The same cave and seed produce identical amoeba growth on 100% of
  runs over at least 100 ticks; two different seeds produce different growth.
  A growth pass takes one growth draw per amoeba cell present at its start, in
  100% of ticks, including ticks on which no cell can grow — plus one direction
  draw per successful attempt, and nothing else.
- **SC-005**: A falling body landing on amoeba detonates it in 100% of attempts;
  a resting body above amoeba detonates it in 0% of attempts, verified over at
  least 100 ticks.
- **SC-006**: An active magic wall converts 100% of bodies that fall into it
  with an empty destination cell, boulder to diamond and diamond to boulder,
  with the result emerging below the wall and falling on the following tick.
  Where the destination cell is blocked or off the grid, the body is destroyed
  and nothing emerges, in 100% of attempts.
- **SC-007**: A magic wall converts on exactly the number of ticks its cave's
  duration specifies — no more, no fewer — and is dead thereafter in 100% of
  runs, including across a further 100 ticks of bodies dropped into it.
- **SC-008**: A magic wall that is never triggered blocks 100% of movement
  attempts and converts nothing, over a full cave.
- **SC-009**: An expanding wall grows exactly one cell per side per tick into
  empty space, in 100% of runs, and grows into non-empty cells or vertically in
  0% of runs.
- **SC-010**: The same cave, seed, and recorded inputs produce an identical
  grid, collected count, status, amoeba extent, magic wall phase and countdown,
  and expanding wall extent on 100% of runs, over at least 100 ticks including
  amoeba growth, a conversion, and expanding wall growth.
- **SC-011**: Every feature-001, -002, and -003 test still passes, except those
  pinning the inert behavior of these three elements, which pass against their
  restated form. The build still emits exactly one self-contained page that
  makes zero network requests.
- **SC-012**: A cave with an amoeba of at least 100 cells, an active magic wall,
  and a growing expanding wall holds the frame-rate target on a mid-range laptop
  — 60 frames per second target, never below 30 — with no per-tick allocation
  growth over a run of at least 1000 ticks.
- **SC-013**: The active magic wall's appearance comes from theme data only:
  zero simulation files and zero drawing-logic branches on theme identity,
  verified by inspecting the change.
- **SC-014**: The automated suite passes with no browser present and covers
  every case listed in FR-039.

### Verified by the maintainer at review time

The following cannot be checked without a browser and are called out here so
review knows what to look at:

- The amoeba's growth *feels* like a creeping threat at the shipped tick rate
  and the shipped default growth rate — visibly moving, not a slideshow, not a
  flood. The rate and the size limit are the dials; the mechanism is the rule.
- The size limit is reachable in normal play: a player who ignores the blob
  should see it turn to erasers within a cave's natural span, not after ten
  minutes of standing still.
- The decision reads: a player who sees the blob and the erasers around it
  should feel invited to seal it in, without being told.
- The active magic wall is obviously *running* (FR-033) — the visual says "a
  clock is ticking" rather than "this wall is a different color" — and its
  duration reads as "a few seconds" rather than as an instant or an eternity.
- A dormant wall and a dead one are genuinely indistinguishable (FR-034), and
  that reads as suspense rather than as a bug — subject to the open question on
  FR-034, which may replace this with the opposite check: that a player can tell
  "not started yet" from "already used up" at a glance.
- Expanding wall growth at one cell per tick reads as menacing rather than
  either imperceptible or unfair.
- The shipped cave teaches all three without a tutorial: the glue should be met
  before it is a problem, the wall should be discovered by dropping something,
  and the bookshelf should close exactly one route the player did not need.
- Whether the amoeba should get its own sound. It is the most obvious candidate
  in the game for an ambient noise that scales with size, and audio is out of
  scope here — this is a note for the audio feature, not a requirement.

## Assumptions

- **All amoeba cells are one collective** (FR-003), including disconnected
  blobs. The request says "if the amoeba is fully enclosed" and "if it grows
  past a size limit" in the singular, and treating each connected blob
  separately would require a connectivity pass every tick for no gameplay gain.
  Caves that want two independent amoebas are not a thing this game needs.
- **Growth is into empty space and dirt only** (FR-006), per the request. It
  cannot enter the kid's cell, which is why the amoeba is an obstacle and not a
  hazard (FR-002) — and why the original never needed an "amoeba kills you"
  rule.
- **Growth is a per-cell probability, so the blob accelerates** (FR-005), per
  the clarification reply. A bigger blob spreads faster, which is what makes
  waiting cost something and makes "seal it now or gamble on another few
  seconds" a decision rather than a countdown a player learns once. The price is
  that the draw count scales with the blob, so FR-005a fixes it at exactly one
  draw per cell per tick regardless of whether the cell could grow — an
  enclosed-cell early exit would be a determinism bug wearing an optimization's
  clothes.
- **A successful attempt picks its direction with a second draw** (FR-006). The
  reply settles how often a cell grows, not which way; a fixed direction
  preference would make blobs grow in a consistent visible slant, which reads as
  a bug rather than as spilled glue. The second draw is taken only on success,
  so the tick's draw sequence is still fixed by the cave, the seed, and the
  inputs.
- **The sealed check is instantaneous** (FR-008), so a body falling past the
  last gap can seal a blob for exactly one tick and cash it out. This is a
  deliberate keep, not an oversight: it is a real technique in the original and
  the alternative — requiring sustained enclosure — introduces a hidden timer
  the player cannot see.
- **The size limit is checked before the sealed check** (FR-009). Both could
  fire on the same tick; something has to win. Boulders winning means an
  overgrown blob cannot be rescued by a last-instant seal, which keeps the size
  limit a real deadline.
- **Conversions do not move on the tick they happen** (FR-009). This matches how
  feature 003 already treats a gold star created by an explosion, and it keeps
  the conversion legible: the player sees the blob become stars, then sees the
  stars fall.
- **A falling body detonates the amoeba, leaving empty space** (FR-011). The
  request and the constitution both state the detonation; the blast content is a
  pick. Empty space is the only content that makes sense: gold stars are the
  butterfly's payout and the reward for sealing the blob, and paying them out
  for dropping a rock on it would make sealing pointless.
- **Amoeba does not chain-detonate** (FR-012). Chains are an enemy behavior; a
  blob that detonated every cell the blast touched would erase itself from any
  cave with a stray eraser, which is not a decision, just a loss.
- **The magic wall's phase is cave-wide** (FR-015), not per-cell. The request
  says "dead permanently for that cave" and gives the duration as a per-cave
  parameter; a stretch of wall is one machine.
- **The activating body is itself converted** (FR-017). "Dormant until the first
  boulder or diamond falls into it, then active" reads most naturally as the
  first body going through rather than being eaten by the transition, and
  wasting the trigger would make the wall's first use feel like a bug.
- **The wall's output is below the whole vertical run of wall cells** (FR-018),
  so a two-thick wall behaves like a one-thick wall. Nothing in the game needs a
  body to stop inside a wall.
- **A body with nowhere to land is destroyed** (FR-018a), per the clarification
  reply. It is the arcade original's behavior, and it is the half of the wall's
  question that makes the other half worth asking: if a badly-aimed drop cost
  nothing, spending erasers to find out how much time is left on the wall would
  be all upside and no decision. It also makes what sits under a wall a real
  cave-design lever.
- **The duration is measured in ticks and includes the activation tick**
  (FR-019). "A few seconds" at the shipped tick rate of 8 ticks per second makes
  the default 40 ticks — five seconds — which is the shipped default until
  review says otherwise.
- **A dormant wall and a dead wall look the same** (FR-034). The request only
  distinguishes them by behavior, and the uncertainty is the interesting part:
  a player who cannot tell whether a wall is spent has a decision to make. The
  clarification reply's aside asks for the opposite, so this one is reopened as
  the marker on FR-034 rather than silently flipped — it decides whether the
  theme carries two magic wall entries or three.
- **The magic wall is the Classroom's "Sticker Machine"** (FR-032), per the
  clarification reply. The firefly keeps "Pencil Sharpener" from feature 003;
  renaming it a feature later would churn the same theme data twice for no gain.
- **The expanding wall grows in both directions** (FR-024). The request says
  "extends horizontally into an adjacent empty cell" without naming a side;
  growing only one way would need the cave to say which, and the original grows
  both.
- **The expanding wall grows every tick** (FR-027), with no rate parameter. The
  request gives it a fixed rate of one cell per tick, unlike the amoeba, and a
  perfectly predictable wall is a useful contrast to a random blob.
- **Default parameters** (FR-028): amoeba size limit 200 cells, magic wall
  duration 40 ticks, and a default amoeba growth rate of a 3-in-100 chance per
  cell per tick — slow enough that a single-cell blob takes a couple of seconds
  to double at the shipped tick rate of 8 ticks per second, and fast enough that
  a blob left alone reaches the size limit within a cave's natural span, since
  under FR-005 the blob accelerates as it grows. All three are dials for review,
  not rules, and the shipped cave sets them explicitly.
- **Amoeba is the seeded generator's second consumer** (FR-037). Sharing one
  generator is what the constitution requires; the consequence is that in a cave
  with both an amoeba and a push, the push outcomes differ from what they would
  have been without the amoeba. That is fine — both are still fully determined
  by cave plus seed plus inputs, which is the property that matters.
- Score, the timer, lives, additional caves, sound, additional themes, the theme
  selector, touch, gamepad, and persistence are all inherited as out of scope
  from the request and the earlier features, and are not re-decided here.

## Out of Scope

Named explicitly in the originating request: the timer, score, lives, and
multiple caves. Also out of scope here: additional themes beyond Classroom, the
theme selector, the arcade shell and its real HUD, cave progression beyond the
single shipped cave, sound, touch controls, gamepad support, and any
persistence. This feature completes the declared element set; every element now
has behavior, and nothing remains inert.
