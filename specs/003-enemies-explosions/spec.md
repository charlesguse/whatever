# Feature Specification: Fireflies, Butterflies, and Explosions

**Feature Branch**: `spec-draft/003-enemies-explosions`

**Created**: 2026-08-30

**Status**: Draft

**Input**: GitHub issue #3 — "Fireflies, butterflies, and explosions", plus the
maintainer's follow-up comment settling the Classroom naming of the two enemies.

The tunnels get inhabitants, and the game gets its signature scoring trick.
Pencil sharpeners buzz along the walls of the tunnels and paper airplanes patrol
their own; touching either one kills the kid in a bloom of explosion. Drop an
eraser on a pencil sharpener and it blows a hole in the cave. Drop one on a paper
airplane and it explodes into a 3x3 of gold stars — which is how a player
actually makes quota on the harder caves.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The tunnels are inhabited, and the inhabitants are lethal (Priority: P1)

A pencil sharpener buzzes its way around the wall of a tunnel, hugging every
corner it meets, and a paper airplane patrols its own loop in the mirror
direction. Both take the same path every time from the same starting cave, so a
player can watch a loop, learn its timing, and thread through it. Stand next to
one for a moment too long and it goes off in the kid's face: the cave ends, and
it ends with a visible bloom where the kid was standing rather than with a
silent freeze.

**Why this priority**: Until now the only way to die was to stand under
something heavy. Enemies are the first hazard that comes to *you*, and their
predictability is what makes them fair. Everything else in this feature —
detonation, the 3x3, the scoring trick — is defined in terms of an enemy being
there to detonate.

**Independent Test**: Load a cave with a pencil sharpener on a simple rectangular
loop and a paper airplane on another, run a fixed number of ticks with no input,
and confirm each one walks its loop in the documented turning direction and
returns to where it started. Then walk the kid into reach of one and confirm the
cave ends in the death state with an explosion visible.

**Acceptance Scenarios**:

1. **Given** a pencil sharpener following a wall with its preferred-turn side
   open, **When** an enemy step runs, **Then** it turns to that side and moves
   one cell into it.
2. **Given** a pencil sharpener whose preferred-turn side is blocked but whose
   cell straight ahead is empty, **When** an enemy step runs, **Then** it moves
   one cell straight ahead and keeps its facing.
3. **Given** a pencil sharpener whose preferred-turn side and cell straight
   ahead are both blocked, **When** an enemy step runs, **Then** it does not
   move and turns 90 degrees away from its preferred side.
4. **Given** a paper airplane in the same three positions, **When** enemy steps
   run, **Then** it behaves as the mirror image of the pencil sharpener.
5. **Given** an enemy on a closed loop of empty cells around a block of wall,
   **When** enough ticks run for a full circuit, **Then** it is back in its
   starting cell with its starting facing, having visited the loop's cells in
   order.
6. **Given** an enemy and the kid in the same cave, **When** ticks run, **Then**
   the enemy steps once for every two ticks the kid may move, on a fixed
   cadence.
7. **Given** the kid is in a cell orthogonally adjacent to an enemy, **When**
   that enemy's next step runs, **Then** the enemy detonates and the cave ends
   in the death state.
8. **Given** an enemy is next to dirt (notebook paper), a body, a wall, the
   classroom door, another enemy, or the grid edge, **When** enemy steps run,
   **Then** it never moves into any of them and never digs, pushes, or falls.

---

### User Story 2 - Drop an eraser on a paper airplane and make quota (Priority: P1)

An eraser dropped onto a paper airplane turns it into a 3x3 of gold stars. That
is the trick the game is built on: on a cave whose quota is higher than the
stars lying loose in the paper, a player makes the difference by dropping
erasers on airplanes. The same eraser dropped on a pencil sharpener blows a 3x3
hole in the cave instead — which is how you open a route rather than how you
score.

**Why this priority**: This is the signature scoring mechanic, and it is what
lets later caves set a quota that cannot be met by digging alone. It is
separately testable from Story 1: a cave can hold a stationary-by-construction
enemy and a single eraser and still prove the whole rule.

**Independent Test**: In a cave with one paper airplane, one pencil sharpener,
and an eraser above each, dig each eraser loose, and confirm the airplane leaves
a 3x3 of gold stars, the sharpener leaves a 3x3 of empty space, and the erasers
themselves are gone. Collect the new stars and confirm they count toward quota
and open the classroom door.

**Acceptance Scenarios**:

1. **Given** a falling eraser directly above a paper airplane, **When** the tick
   runs, **Then** the airplane detonates, the eraser is consumed by the blast,
   and after the blast resolves a 3x3 of gold stars stands where the airplane
   was.
2. **Given** a falling eraser directly above a pencil sharpener, **When** the
   tick runs, **Then** the sharpener detonates and after the blast resolves a
   3x3 of empty space stands where it was.
3. **Given** a falling gold star directly above either enemy, **When** the tick
   runs, **Then** it detonates that enemy exactly as a falling eraser would.
4. **Given** an eraser resting — not falling — directly above either enemy,
   **When** ticks run, **Then** nothing detonates; a resting body is furniture,
   exactly as it is above the kid.
5. **Given** gold stars created by a paper airplane's blast, **When** the kid
   collects them, **Then** they count toward the cave's quota like any other
   gold star.
6. **Given** a cave whose quota exceeds the gold stars drawn in its grid but is
   within reach once its paper airplanes are detonated, **When** the cave is
   loaded, **Then** it loads successfully rather than being rejected as
   unwinnable.

---

### User Story 3 - Blasts reshape the cave, and they chain (Priority: P2)

An explosion is a thing in its own right: for a moment there is a bloom of
confetti filling a 3x3, and then it is gone, leaving behind whatever that blast
makes. It destroys the paper, the bricks, the erasers, and the stars it touches
— but a locker survives it, and so does the classroom door, so a blast never
punches a hole in the outer shell of a cave or destroys the way out. Blasts
reach other enemies, and those go off too, so one well-dropped eraser in a row
of paper airplanes pays out far more than one.

**Why this priority**: The blast rules are what make Stories 1 and 2 safe to
build on and what make caves designable — a level author needs to know exactly
what a blast eats and what it spares. Chains are the payoff that makes the
scoring trick worth setting up. It is testable on its own with a single
detonation next to a wall.

**Independent Test**: Detonate an enemy adjacent to a locker and to a mixed
neighbourhood of paper, brick, erasers, and stars; confirm the locker and the
door are untouched and everything else is gone. Then detonate one enemy in a
line of enemies and confirm every enemy in reach goes off.

**Acceptance Scenarios**:

1. **Given** an enemy detonating with a locker (steel wall) in its 3x3, **When**
   the blast is stamped, **Then** the locker is unchanged and the rest of the
   3x3 becomes explosion.
2. **Given** an enemy detonating with notebook paper, a cinder brick wall, an
   eraser, and a gold star in its 3x3, **When** the blast is stamped, **Then**
   all of them are destroyed.
3. **Given** an enemy detonating at the edge of the cave, **When** the blast is
   stamped, **Then** the blast is clipped at the boundary and nothing wraps or
   errors.
4. **Given** a blast has been stamped, **When** its lifetime elapses, **Then**
   every cell of that blast turns into the same content — gold stars for a paper
   airplane, empty space for a pencil sharpener or the kid — on the same tick.
5. **Given** a blast whose 3x3 contains another enemy, **When** the blast is
   stamped, **Then** that enemy detonates too, with its own content, and the
   chain continues as far as it reaches.
6. **Given** an explosion cell, **When** the kid or an enemy tries to move into
   it, **Then** the move is refused; and **when** a body is above it, the body
   rests on it and does not roll off it.
7. **Given** the kid is caught in a blast, **When** the blast is stamped,
   **Then** the cave ends in the death state with the bloom visible and frozen.

---

### User Story 4 - The classroom calls them by their right names (Priority: P2)

Feature 001 shipped placeholder Classroom names for the two enemies, and it got
them backwards: it calls the firefly a Paper Airplane and the butterfly a Hall
Pass. Now that both have behavior, the names are settled — the pencil sharpener
is the one bolted to the wall that buzzes its way around the tunnels, and the
paper airplane is the light one that bursts into a shower of gold stars.

**Why this priority**: It is appearance only, so it cannot break physics, but
shipping enemies under the wrong names is worse than shipping them unnamed. It
also serves as a live test of the theme contract: correcting two labels and two
glyphs must not touch a single simulation file.

**Independent Test**: Read the Classroom theme entries for the two enemies and
confirm the labels and glyphs; confirm by inspection of the change that no file
under the simulation, and no drawing logic, was touched to achieve it.

**Acceptance Scenarios**:

1. **Given** the Classroom theme, **When** the firefly's entry is read, **Then**
   its label is "Pencil Sharpener".
2. **Given** the Classroom theme, **When** the butterfly's entry is read,
   **Then** its label is "Paper Airplane".
3. **Given** the two entries, **When** they are rendered side by side, **Then**
   they are distinguishable from each other and from every other element at the
   shipped cell size.
4. **Given** this renaming, **When** the change is reviewed, **Then** it touches
   only theme data — no simulation file and no drawing logic.

---

### Edge Cases

- **The kid walks into reach of an enemy between that enemy's steps**: the enemy
  detonates on its next step, up to two ticks later. The kid gets that long to
  step back out of reach — the same "one tick of warning" bargain that falling
  bodies make, sized to the enemy cadence.
- **The kid is diagonally adjacent to an enemy**: nothing happens. Only the four
  orthogonal neighbours count as contact, so a player can squeeze past an enemy
  diagonally, and that is a real, learnable technique rather than a loophole.
- **An enemy is completely walled in**: it turns in place every step, forever,
  and never moves. This is a legal, useful cave-design element, not a stall.
- **An enemy in open space with nothing to follow**: it circles a 2x2 loop
  forever, by the same turning rule. Nothing special-cases it.
- **Two enemies want the same empty cell on the same tick**: impossible by
  construction — the first reached in scan order takes the cell, and the cell is
  no longer empty when the second is stepped.
- **An enemy steps into a cell that has already been scanned this tick**: it is
  not stepped again that tick, exactly as a body that falls into an
  already-scanned cell resumes next tick.
- **A body is pushed into an enemy's cell**: the push fails. The cell beyond the
  eraser is not empty, so the push was never eligible and no randomness is
  drawn — the existing push rule already covers this with no change.
- **An enemy walks under a resting eraser**: nothing happens. The eraser is not
  falling, so it never detonates anything. It also never begins falling, because
  the cell below it is occupied by the enemy.
- **A body is resting on an enemy that then walks out from under it**: the body
  begins falling on the following tick by the ordinary falling rule. It was not
  falling when the enemy left, so it does not detonate anything on the way.
- **A falling body reaches an enemy and the enemy is destroyed**: the body is
  inside the 3x3 it triggered and is destroyed with it. A blast never spits the
  eraser back out.
- **Two blasts overlap on the same tick**: every cell they share takes the
  content of the later blast in the tick's fixed resolution order. Overlap is
  legal and deterministic; it is not an error.
- **A blast destroys the cell the kid is standing in**: the kid dies, and dies
  once — a kid already dead is not re-detonated by a later blast in the same
  chain.
- **A blast covers the closed classroom door**: the door survives, so a cave can
  never be made unwinnable by blowing up its exit.
- **A blast covers an element that has no behavior yet** (amoeba, magic wall,
  expanding wall): it is destroyed like any other destructible content. Those
  elements stay otherwise inert until their own features.
- **An explosion cell resolves into a gold star with empty space beneath it**:
  the star begins falling on a later tick by the ordinary falling rule, never on
  the tick it is created.
- **The kid dies while a chain is still blooming**: the cave freezes where it
  is, with the explosions on screen exactly as they were. The bloom does not
  finish resolving, because a terminal cave does not advance.
- **A cave with no enemies at all**: behaves exactly as it does today. Nothing
  in this feature costs anything in a cave that does not use it.

## Requirements *(mandatory)*

### Functional Requirements

#### The enemies

- **FR-001**: The two enemy elements already declared by feature 001 — firefly
  (Classroom: pencil sharpener) and butterfly (Classroom: paper airplane) —
  MUST gain behavior. Each occupies exactly one cell of the grid and is part of
  cave state.
- **FR-002**: Enemies MUST move on their own cadence: **exactly one enemy step
  per two simulation ticks**, while the kid continues to act on every tick. The
  cadence MUST be derived from the cave's own tick counter alone — no wall
  clock, no separate accumulator — and the first enemy step MUST fall on the
  cave's first tick, so that after 1 tick every enemy has stepped once, after 2
  ticks still once, and after 3 ticks twice.
- **FR-003**: Each enemy MUST carry a **facing** — one of the four orthogonal
  directions — as part of cell state, carried with the enemy from tick to tick.
  It MUST NOT be recomputed from the surrounding cells at read time.
- **FR-004**: On an enemy step, exactly one of these three outcomes MUST occur,
  tested in this order:
  1. The cell on the enemy's **preferred-turn side** (FR-005) relative to its
     facing is empty — the enemy turns to face that side and moves into it.
  2. Otherwise, the cell **straight ahead** is empty — the enemy moves into it
     and keeps its facing.
  3. Otherwise, the enemy **does not move** and turns 90 degrees toward its
     non-preferred side.
- **FR-005**: The **firefly prefers left turns** and the **butterfly prefers
  right turns**. The preference is fixed per enemy type, applies to every enemy
  of that type, and MUST NOT consult randomness.
- **FR-006**: An enemy MUST move only into an **empty** cell. Notebook paper,
  erasers, gold stars, either wall, the classroom door open or closed, another
  enemy, an explosion, and the grid boundary all block it. An enemy never digs,
  never pushes, never falls, is never pushed, and is never a roll surface.
- **FR-007**: Every enemy MUST begin the cave facing the same documented
  direction — **left** — so that a cave's ASCII grid alone fully determines its
  enemies' paths.
- **FR-008**: Enemy stepping MUST obey the existing fixed scan order and the
  moved-this-tick flag: an enemy that steps into a cell not yet scanned this
  tick MUST NOT be stepped a second time in the same tick.
- **FR-009**: An enemy's patrol MUST be a pure function of the cave and the tick
  count — no randomness is drawn for enemy movement, ever.

#### Detonation triggers

- **FR-010**: On an enemy's step, if the kid occupies any of the **four
  orthogonally adjacent** cells, that enemy MUST detonate instead of moving.
  Diagonal adjacency MUST NOT trigger it.
- **FR-011**: A **falling** eraser or gold star whose cell directly below holds
  an enemy MUST detonate that enemy, and MUST NOT move into that cell. A body
  that is not falling MUST NEVER detonate anything.
- **FR-012**: An enemy inside a blast MUST detonate (FR-020).
- **FR-013**: The kid MUST detonate when caught in a blast, and MUST detonate
  when a falling body reaches their cell. [NEEDS CLARIFICATION: this second
  clause changes feature 002's FR-010, where a falling body simply took the
  kid's cell and the cave went to the death state with no explosion. Should a
  crushing death now bloom like every other death, or should crushing keep its
  quieter feature-002 behavior and only enemy contact and blasts produce a
  player explosion?]
- **FR-014**: Detonation MUST have no trigger in this feature other than
  FR-010–FR-013.
- **FR-015**: Whenever the kid detonates, the cave MUST enter the death state on
  that tick. Per feature 002's FR-029, the cave then stops advancing, so the
  bloom stays on screen exactly as it was.

#### The blast

- **FR-016**: A detonation MUST stamp the **3x3 area centered on the detonating
  cell**, clipped at the grid boundary. No wrapping, no error at an edge or a
  corner.
- **FR-017**: Every cell of that 3x3 MUST become an explosion cell, destroying
  whatever it held, **except** a steel wall (locker) and the classroom door
  (open or closed), which MUST be left completely untouched and MUST remain a
  hole in the blast. [NEEDS CLARIFICATION: the originating request says a blast
  destroys everything except steel wall, but feature 002's FR-023 already
  specifies the closed door as indestructible and a destructible exit can make a
  cave unwinnable. Should the door survive blasts as specified here, or should
  it be destructible, with cave design carrying the burden of keeping caves
  winnable?]
- **FR-018**: What a blast leaves behind MUST be determined by what detonated:
  a **firefly leaves empty space**, a **butterfly leaves gold stars
  (diamonds)**, and the **kid leaves empty space**. Every cell of a single blast
  MUST resolve to the same content.
- **FR-019**: An explosion cell MUST persist for exactly **2 simulation ticks**
  after the tick that created it, and all cells of one blast MUST then convert
  to that blast's content on the same tick. Each explosion cell MUST carry how
  long it has left and what it will become, as cell state.
- **FR-020**: Converting is an explosion cell's entire action for that tick: a
  gold star created by a conversion MUST NOT also fall or roll on the tick it
  appears, and MUST begin falling on a later tick by the ordinary falling rule.
- **FR-021**: While a cell holds an explosion it MUST block everything: the kid
  cannot move into it, an enemy cannot step into it, and a body above it comes
  to rest on it. An explosion MUST NOT be a roll surface, MUST NOT be
  collectible, and MUST NOT be dug or grabbed.
- **FR-022**: When two blasts in the same tick cover the same cell, the later
  one in that tick's resolution order MUST win. The order MUST be fixed and
  reproducible.

#### Chains

- **FR-023**: An enemy destroyed by a blast MUST itself detonate, producing its
  own 3x3 with its own content, and that chain MUST continue for as long as it
  reaches further enemies. Each enemy MUST detonate at most once, so a chain
  always terminates. Chains MUST resolve **within the tick that started them**,
  in a fixed order — blasts in the order they were triggered, and the enemies
  within one blast in the grid's scan order. [NEEDS CLARIFICATION: should a
  chain resolve atomically inside one tick as specified here, or should each
  link detonate on the following tick so the player watches a cascade travel
  across the cave? The second reads better on screen; the first is simpler to
  reason about and to pin with a test.]
- **FR-024**: A chain MUST NOT re-detonate the kid: once the cave is in the
  death state the kid is dead once, and the remaining links of that same chain
  MUST still resolve normally within their tick.

#### The quota and cave data

- **FR-025**: Cave parsing MUST stop rejecting a cave whose declared quota
  exceeds the gold stars drawn in its grid when paper airplanes can supply the
  difference. The check MUST become: reject only when the quota exceeds the gold
  stars in the grid **plus nine per butterfly**. This is a guard against
  obviously malformed cave data, not a proof of winnability, and the failure
  message MUST still name the cave and both numbers and produce no partial grid.
- **FR-026**: The shipped cave MUST gain at least one pencil sharpener on a
  patrol a player can watch and learn, and at least one paper airplane
  positioned so that an eraser can be dropped on it. The cave MUST remain
  winnable and MUST NOT kill or trap the kid at tick zero — in particular, no
  enemy starts orthogonally adjacent to the kid.
- **FR-027**: The shipped cave's quota MUST be reachable without detonating the
  paper airplane, so that a player who has not yet discovered the trick can
  still finish, while detonating it remains the faster route.
- **FR-028**: Enemies MUST be placed in cave data as ordinary characters in the
  hand-authored ASCII grid, using the mapping that already exists. Adding or
  moving an enemy MUST NOT touch any simulation file.

#### Rendering and themes

- **FR-029**: The Classroom theme MUST label the firefly **"Pencil Sharpener"**
  and the butterfly **"Paper Airplane"**, replacing the placeholder names from
  feature 001, and MUST give each a glyph and color that read at the shipped
  cell size and are distinguishable from each other and from every other
  element.
- **FR-030**: That renaming MUST be a change to theme data alone. It MUST NOT
  require a change to any file under the simulation and MUST NOT require a
  change to drawing logic. If it cannot be done without one, that is a defect in
  the theme contract: the missing field MUST be added to the contract and the
  defect MUST be reported, rather than worked around with a special case.
- **FR-031**: Explosions MUST be drawn from the theme's existing explosion
  entry, with no appearance written at a drawing site and no branching on which
  theme is active.
- **FR-032**: Adding a further theme MUST still require only a new entry in the
  theme registry — enemies and explosions included, and no simulation or
  drawing-logic change.

#### Read-only access for the shell

- **FR-033**: The simulation MUST expose, as read-only accessors: an enemy's
  facing at a given cell, and, for an explosion cell, that it is one. Nothing
  outside the simulation may write either.
- **FR-034**: The simulation MUST still contain no wall-clock time, no page or
  browser access, and no randomness other than its own seeded generator. This
  feature MUST add **no new consumer** of that generator: push resolution
  remains its only one, so a recorded input sequence replays identically no
  matter how many enemies detonate.

#### Tests

- **FR-035**: Every rule above that changes the grid MUST be pinned by an ASCII
  cave test — a starting grid, a tick count and optional per-tick inputs, and
  the expected grid — with readable side-by-side ASCII on failure.
- **FR-036**: The suite MUST cover, at minimum, each of the following as its own
  case:
  - a pencil sharpener patrolling a simple loop for several ticks, cell by cell;
  - a paper airplane patrolling the same loop, mirrored;
  - each enemy type turning correctly at a corner, in each of the three
    step outcomes of FR-004;
  - the enemy cadence: one step per two ticks, checked at ticks 1, 2, and 3;
  - an enemy blocked on every side turning in place without moving;
  - an enemy refusing to enter notebook paper, a body, a wall, the door, and
    another enemy;
  - a falling eraser detonating each enemy type, and a falling gold star doing
    the same;
  - a resting eraser above each enemy type detonating nothing over many ticks;
  - a paper airplane leaving a 3x3 of gold stars, counted exactly;
  - a pencil sharpener leaving a 3x3 of empty space;
  - a blast sparing a steel wall inside its 3x3, and sparing the classroom door;
  - a blast destroying paper, brick, an eraser, and a gold star;
  - a blast clipped at an edge and at a corner of the grid;
  - the explosion lifetime: the 3x3 is explosion for exactly the specified
    ticks and converts on the expected tick, all cells at once;
  - a gold star created by a blast not moving on the tick it appears, then
    falling normally afterwards;
  - a chain reaction through several enemies, including a mixed chain of both
    types leaving both gold stars and empty space;
  - the kid dying on contact with each enemy type, from each of the four
    orthogonal directions, and **not** dying from a diagonal;
  - the kid caught in a blast started by something else;
  - the cave freezing in its terminal state with the explosion cells still on
    the grid;
  - gold stars from a blast counting toward quota and opening the door;
  - a cave whose quota exceeds its drawn gold stars but is within the paper
    airplane allowance loading successfully, and one that exceeds even that
    allowance being rejected at parse time;
  - a full replay: the same cave and inputs producing an identical grid,
    collected count, and status after a run that includes patrols, a chain, and
    a death.
- **FR-037**: The suite MUST continue to run with no browser, canvas, audio
  device, or browser-automation tooling.

#### Non-regression

- **FR-038**: Every rule and test from features 001 and 002 MUST still hold,
  with exactly two stated exceptions, both amended here and nowhere else:
  feature 002's **FR-010** (how a falling body kills the kid — see FR-013) and
  feature 002's **FR-027** (the quota-versus-gold-stars parse check — see
  FR-025). Where an earlier test pins an amended rule, that test MUST be updated
  to the new rule stated here and MUST NOT be deleted or weakened.
- **FR-039**: The inert-element rule of feature 002 MUST continue to hold for
  every element this feature does not touch: amoeba, magic wall, and expanding
  wall stay inert, and a body still rests on them without rolling.
- **FR-040**: Determinism MUST extend to everything added here: the same cave,
  seed, and ordered inputs MUST produce an identical grid, collected count,
  status, enemy positions and facings, and explosion state after any number of
  ticks.

### Key Entities

- **Enemy facing**: The direction an enemy is currently heading, one of four.
  Part of cell state, carried tick to tick. Together with the turning preference
  it fully determines the patrol, which is what makes a patrol learnable.
- **Turning preference**: A fixed property of the enemy type — left for the
  firefly (pencil sharpener), right for the butterfly (paper airplane). Never
  random, never per-cave.
- **Enemy cadence**: One enemy step per two simulation ticks, derived from the
  cave's tick counter. The kid is twice as quick as anything hunting them.
- **Detonation**: The event that turns a cell and its neighbours into a blast.
  Triggered by enemy contact with the kid, by a falling body landing on an
  enemy, or by another blast reaching an enemy.
- **Blast**: One 3x3 stamp, clipped at the grid boundary, with a single
  resolution content decided by what detonated it.
- **Explosion cell**: A cell mid-bloom. Carries how many ticks it has left and
  what it will become. Blocks everything while it lasts, then converts.
- **Blast content**: What one blast leaves behind — gold stars from a paper
  airplane, empty space from a pencil sharpener or the kid. This is the game's
  scoring trick expressed as one field.
- **Butterfly diamond allowance**: The nine gold stars a paper airplane can be
  worth, used only by the parse-time quota check as an upper bound.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An enemy on a closed loop returns to its exact starting cell and
  facing after one full circuit, and repeats the identical path on 100% of runs
  of the same cave.
- **SC-002**: Enemies take exactly one step per two simulation ticks over a run
  of at least 100 ticks, in 100% of runs.
- **SC-003**: The kid dies in 100% of attempts where an enemy's step finds them
  orthogonally adjacent, and in 0% of attempts where the only adjacency is
  diagonal.
- **SC-004**: A falling body landing on an enemy detonates it in 100% of
  attempts; a resting body above an enemy detonates it in 0% of attempts,
  verified over at least 100 ticks.
- **SC-005**: A detonated paper airplane yields exactly the gold stars its
  clipped 3x3 allows — nine in open cave, fewer only where the boundary, a
  locker, or the door cuts into it — in 100% of attempts. A detonated pencil
  sharpener yields zero gold stars in 100% of attempts.
- **SC-006**: A steel wall inside a blast survives in 100% of attempts, and so
  does the classroom door, open or closed.
- **SC-007**: Every cell of one blast converts on the same tick, exactly the
  specified number of ticks after the blast was stamped, in 100% of runs.
- **SC-008**: A chain through a line of enemies detonates every enemy the chain
  reaches, and no enemy detonates twice, in 100% of runs.
- **SC-009**: Gold stars produced by a blast are collectible and count toward
  quota exactly like drawn ones, in 100% of attempts.
- **SC-010**: A cave whose quota exceeds its drawn gold stars but is within the
  paper-airplane allowance loads in 100% of attempts; one that exceeds the
  allowance is rejected at parse time in 100% of attempts, with a message naming
  the cave and both numbers.
- **SC-011**: The same cave replayed with the same recorded inputs produces an
  identical grid, collected count, status, enemy positions and facings, and
  explosion state on 100% of runs, over a sequence of at least 100 ticks that
  includes patrols, a chain reaction, and a death.
- **SC-012**: Every feature-001 and feature-002 test still passes, except those
  covering the two rules FR-038 names as amended, which pass against their
  restated form. The build still emits exactly one self-contained page that
  makes zero network requests.
- **SC-013**: A cave with several enemies patrolling and a chain reaction of at
  least six blasts holds the frame-rate target on a mid-range laptop — 60 frames
  per second target, never below 30 — with no per-tick allocation growth over a
  long run.
- **SC-014**: Correcting the two Classroom enemy names changes theme data only:
  zero simulation files and zero drawing-logic files, verified by inspecting the
  change.
- **SC-015**: The automated suite passes with no browser present and covers
  every case listed in FR-036.

### Verified by the maintainer at review time

The following cannot be checked without a browser and are called out here so
review knows what to look at:

- Patrol legibility: at the shipped tick rate, an enemy's loop is watchable and
  its timing learnable rather than a blur, and the half-speed cadence (FR-002)
  reads as "the kid is quicker than the thing chasing them" rather than as
  sluggishness. The ratio is the dial; the spec fixes the mechanism.
- The bloom reads: two ticks of explosion (FR-019) is long enough to see and
  short enough not to stall the cave, and a chain reaction is exciting rather
  than confusing.
- Death by enemy is legible: it is obvious what killed the kid, and the frozen
  bloom makes the moment clear rather than looking like a crash.
- The pencil sharpener and the paper airplane are distinguishable at a glance
  from each other, from erasers, and from gold stars, and the paper airplane
  looks like the thing that is about to pay out.
- Whether the renderer should orient an enemy's glyph by its facing. The
  accessor is there (FR-033); using it is a review-time judgement, not a
  requirement.
- The reworked cave teaches the drop-on-an-airplane trick without stating it —
  a player should discover it by accident and then go looking for it.

## Assumptions

- **The turning preference pick** (FR-005): firefly left, butterfly right. The
  request asked for a preference to be chosen and documented; this is that
  choice, and it matches the original game's fireflies and butterflies.
- **The enemy rate pick** (FR-002): one step per two ticks. The request asked
  for a ratio to be picked, stated, and tested; this is that pick. It keeps the
  kid strictly quicker than any enemy, which is what makes threading a patrol
  possible.
- **The step algorithm** (FR-004) is the classic wall-follower: preferred turn,
  else straight ahead, else turn away without moving. It is what makes an enemy
  hug a surface, and it is the only reading of "moves along whatever surface
  they are following" that produces stable, predictable loops.
- **Initial facing** (FR-007) is left for every enemy. It is an arbitrary but
  documented pick, made so a cave's ASCII grid alone determines its patrols. A
  later feature may add per-enemy starting facing to cave data; nothing here
  depends on it staying uniform.
- **Explosion lifetime** (FR-019) is two ticks. "Short" was the only guidance;
  two ticks is long enough to see at the shipped tick rate and short enough that
  a chain does not stall play. It is a dial for review, not a rule.
- **Contact means orthogonal adjacency** (FR-010). Enemies only enter empty
  cells, so an enemy can never step onto the kid; "contact" must therefore mean
  proximity, and four-way adjacency is the reading that keeps diagonal squeezes
  possible.
- **The blast is centered on whatever detonated**, and its content comes from
  that same thing. A kid caught in a paper airplane's blast therefore leaves a
  gold star where they stood, because the blast is the airplane's, not theirs.
- **Blasts spare the classroom door** as well as steel walls (FR-017), because
  feature 002 already specifies the closed door as behaving exactly like a steel
  wall in every respect including being indestructible, and because a
  destructible exit can strand a player in a cave they cannot leave. Flagged for
  confirmation.
- **The parse-time quota check is relaxed, not removed** (FR-025). Nine gold
  stars per paper airplane is a generous upper bound — a blast clipped by the
  boundary or a locker yields fewer — so the check catches genuinely malformed
  data without rejecting a legitimately hard cave.
- Enemies add **no** randomness. The whole feature is deterministic from cave
  and inputs, so push resolution remains the seeded generator's only consumer
  and existing replay tests keep their exact meaning.
- Score is out of scope, so a detonated paper airplane is worth exactly the gold
  stars it leaves and nothing more. The points a blast is worth arrive with
  scoring.
- Sound is out of scope even though a buzzing pencil sharpener and a bang are
  the obvious places for it. Audio arrives with its own feature and its own
  theme fields; "buzzes" in the request is describing the thing, not requiring a
  noise yet.
- The tick rate, camera, single-file build, push mechanics, grab, restart key,
  and collected/quota readout are inherited from features 001 and 002 unchanged
  and are not re-decided here.

## Out of Scope

Named explicitly in the originating request: the amoeba, the magic wall, lives
and retry, and score. Also out of scope here: the expanding wall, additional
themes beyond Classroom, the theme selector, the arcade shell and its real HUD,
the countdown timer, cave progression beyond the single shipped cave, sound,
touch controls, gamepad support, and any persistence. The elements this feature
does not name stay inert exactly as they are today.
