# Feature Specification: Rock Physics — Falling, Rolling, Pushing, Crushing, and the Exit

**Feature Branch**: `spec-draft/002-rock-physics-exit`

**Created**: 2026-08-30

**Status**: Draft

**Input**: GitHub issue #2 — "Rock physics: falling, rolling, pushing, crushing, and the exit"

The heart of Boulder Dash. Feature 001 gave us a cave to dig; this one makes the
cave dangerous and gives it a point. Erasers fall, roll, and crush; gold stars
are collected against a quota; the classroom door opens when the quota is met
and entering it completes the cave.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The cave turns dangerous (Priority: P1)

A player digs notebook paper out from under an eraser. The eraser drops. Dig a
column and stand in it and the eraser lands on the kid and the cave ends in a
visible death — not a crash, not a frozen white page. Walk *under* an eraser
that is sitting still and nothing happens: a resting eraser is furniture. An
eraser that lands on another eraser rolls off the side and keeps going. Lean on
an eraser sideways with an empty space beyond it and it resists for a moment
before giving way one cell; shove it into anything else and it refuses to budge
no matter how long you lean.

**Why this priority**: This is the mechanic the whole game is built on. Every
later element — enemies, magic wall, amoeba — is defined in terms of falling
bodies. If only this ships, the cave is already a real hazard and the game has
tension for the first time.

**Independent Test**: Load the cave, dig out from under an eraser and watch it
fall; stand in its path and die; stand under a resting eraser and survive; drop
an eraser onto a stack and watch it roll off; hold a direction against one with
open space beyond it until it gives, and then against one facing a wall.

**Acceptance Scenarios**:

1. **Given** an eraser with an empty cell directly below it, **When** a tick
   runs, **Then** the eraser moves down one cell and is marked as falling.
2. **Given** a falling eraser with an empty cell directly below it, **When**
   ticks continue to run, **Then** it keeps moving down one cell per tick for
   as long as the cell below stays empty.
3. **Given** a falling eraser with a non-empty cell directly below it that is
   not the kid, **When** a tick runs, **Then** it stops moving and is no longer
   marked as falling.
4. **Given** an eraser resting on another eraser, with the cell to one side and
   the cell diagonally below that side both empty, **When** a tick runs,
   **Then** it moves one cell to that side and is marked as falling.
5. **Given** an eraser resting on a steel wall (locker) or on notebook paper
   with both sides open, **When** ticks run, **Then** it never rolls.
6. **Given** an eraser resting on another eraser with the side cell empty but
   the cell diagonally below it occupied, **When** ticks run, **Then** it does
   not roll to that side.
7. **Given** a falling eraser directly above the kid, **When** a tick runs,
   **Then** the eraser takes the kid's cell and the cave ends in the death
   state.
8. **Given** a resting eraser directly above the kid, **When** ticks run,
   **Then** nothing happens to either of them.
9. **Given** the kid faces an eraser horizontally with an empty cell beyond it,
   **When** the player presses that direction, **Then** the tick draws the
   push's fixed chance from the cave's seeded generator; on a tick where the
   push gives, the eraser moves one cell further in that direction and the kid
   takes the eraser's old cell in the same tick, and on a tick where it does
   not, neither of them moves.
10. **Given** the kid faces an eraser horizontally with anything other than an
    empty cell beyond it, **When** the player presses that direction, **Then**
    neither the kid nor the eraser moves, no chance is drawn, and the seeded
    generator is left exactly where it was.
11. **Given** the kid is directly above or below an eraser, **When** the player
    presses toward it, **Then** nothing moves — erasers are never pushed
    vertically.
12. **Given** a vertical stack of erasers whose support is removed, **When**
    ticks run, **Then** the stack resolves over several ticks rather than all
    at once, because a body that moves into an already-scanned cell resumes on
    the following tick.

---

### User Story 2 - Collect the quota and leave (Priority: P1)

Gold stars are scattered in the notebook paper. Walking into one collects it and
the count goes up on a small on-screen readout of collected-against-quota. Once
the cave's quota is met, the classroom door — which
until then looked and behaved exactly like a locker — starts flashing and
becomes enterable. Walking into it ends the cave with a visible completion
state.

**Why this priority**: Without this the cave has hazards but no objective.
Together with Story 1 it makes a complete, winnable, losable cave — the first
time Recess Rocks is actually a game. It is separately testable from Story 1:
collection, quota, and the exit can be exercised in a cave with no erasers in
it at all.

**Independent Test**: In a cave with a known number of gold stars and a known
quota, collect fewer than the quota and confirm the readout tracks each pickup
and the door is still solid and indistinguishable from a locker; collect the
last one and confirm the door begins flashing; walk into it and confirm the cave
reports completion.

**Acceptance Scenarios**:

1. **Given** the kid is next to a gold star, **When** the player presses that
   direction, **Then** the star is removed, the kid occupies that cell, and the
   collected count increases by exactly one.
2. **Given** the collected count is below the cave's quota, **When** the player
   presses toward the classroom door, **Then** the kid does not move and the
   door is unchanged — it behaves exactly like a locker.
3. **Given** the collected count reaches the cave's quota, **When** the next
   tick runs, **Then** the door becomes enterable and is visibly flashing.
4. **Given** the door is open, **When** the player presses toward it, **Then**
   the kid enters it and the cave ends in the completed state.
5. **Given** the quota has been met, **When** the player collects further gold
   stars, **Then** the count keeps rising and the door stays open — meeting the
   quota is permanent.
6. **Given** a falling gold star lands on the kid, **When** the tick runs,
   **Then** the kid dies exactly as with a falling eraser — falling stars are
   as lethal as falling erasers.
7. **Given** a cave with a declared quota, **When** the kid collects a gold
   star, **Then** the on-screen collected/quota readout shows the new count
   against that quota, with its wording taken from the active theme.

---

### User Story 3 - Reach past a cell without stepping into it (Priority: P2)

Holding the grab key and pressing a direction clears notebook paper or collects
a gold star in that direction while the kid stays exactly where they are. This
is how a player opens a hole under an eraser without stepping into the hole, and
how they take a star out of a wall of paper without committing to the cell
behind it.

**Why this priority**: It is the survival tool that makes Story 1's hazards
fair rather than punishing. The cave is playable without it, so it is not P1,
but the classic Boulder Dash feel is not there without it.

**Independent Test**: Hold the grab key and press each direction against
notebook paper, a gold star, an eraser, a wall, and the cave boundary, and
confirm the kid never moves in any of those cases while paper and stars still
disappear.

**Acceptance Scenarios**:

1. **Given** the kid is next to notebook paper, **When** the player holds grab
   and presses that direction, **Then** the paper is removed, the cell becomes
   empty, and the kid does not move.
2. **Given** the kid is next to a gold star, **When** the player holds grab and
   presses that direction, **Then** the star is collected, the count increases
   by one, and the kid does not move.
3. **Given** the kid is next to an eraser, **When** the player holds grab and
   presses that direction, **Then** nothing moves — grab never pushes.
4. **Given** the kid is next to a wall, a closed door, or the cave boundary,
   **When** the player holds grab and presses that direction, **Then** nothing
   changes and the kid does not move.
5. **Given** the kid is next to an empty cell, **When** the player holds grab
   and presses that direction, **Then** nothing changes and the kid does not
   move.

---

### User Story 4 - Failing is visible and recoverable (Priority: P2)

When the kid is crushed, the cave stops and the player is told, in the theme's
own words, that the run is over. When the cave is completed, the same thing
happens with a different message. Either way the page is still alive and
responsive, and one key puts the player back at the start of the cave.

**Why this priority**: Story 1 introduces the first way to lose. A failure state
that leaves the page frozen or blank would make the game feel broken rather than
hard. Lives, score, and cave progression are a later feature — this is only the
minimum that keeps failure from being a dead end.

**Independent Test**: Die on purpose, confirm the cave freezes with a visible
message and the page still responds; press the restart key and confirm the cave
is back exactly as it started. Repeat by completing the cave.

**Acceptance Scenarios**:

1. **Given** the kid has been crushed, **When** the death state is entered,
   **Then** a message is shown, the cave stops advancing, and the page keeps
   responding to input.
2. **Given** the cave has ended in either terminal state, **When** further
   ticks would run, **Then** nothing in the cave moves.
3. **Given** the cave has ended in either terminal state, **When** the player
   presses the restart key, **Then** the cave is rebuilt from its definition —
   same layout, same collected count of zero, same random seed — and play
   resumes.
4. **Given** the cave is mid-play and nobody has died, **When** the player
   presses the restart key, **Then** the cave restarts from the beginning in
   the same way.

---

### Edge Cases

- **A body lands on the kid on the same tick the kid tries to move**: the scan
  order settles it. A falling body higher in the grid is processed before the
  kid, so it takes the cell first and the kid's move into that cell is simply
  blocked; the kid is only killed when a falling body moves into the cell the
  kid actually occupies at that moment.
- **The kid walks under a body that is already falling**: the body's cell below
  is occupied by the kid, so on the next tick the falling body kills them. The
  kid gets exactly one tick of warning — this is the intended difficulty, not a
  bug.
- **The kid stands still under a resting body and the support beneath the body
  never changes**: nothing happens, forever. The body's cell below is the kid,
  which is not empty, so it never begins falling.
- **A body rolls into a cell that has already been scanned this tick**: it
  resumes moving on the following tick. This is what makes stacks collapse over
  several ticks instead of instantly.
- **Two bodies want the same cell in one tick**: impossible by construction —
  the first one to be reached in scan order takes the cell, and the cell is no
  longer empty when the second is scanned.
- **A body falls onto an element that has no behavior yet** (firefly,
  butterfly, amoeba, magic wall, expanding wall, explosion): it stops and rests
  there, exactly as it would on notebook paper. Nothing detonates, nothing
  crashes. Those elements remain inert until their own feature.
- **A body rests on an element that has no behavior yet**: it does not roll off
  it. Only erasers, gold stars, and cinder brick are roll surfaces.
- **A body falls onto the classroom door, open or closed**: it rests on the
  door and never rolls off it, exactly as with a locker.
- **The kid pushes a body that is currently falling**: the push fails, and it
  fails deterministically — no chance is drawn. Only a resting body can be
  pushed.
- **The kid presses into an eraser that cannot move anyway** (a wall beyond it,
  the grid edge beyond it, or the eraser is falling): the tick draws nothing
  from the seeded generator. Otherwise the random stream would advance
  differently depending on what the player leaned against, and two replays that
  differ only in a hopeless push would diverge.
- **The kid pushes a body into a cell that then has nothing under it**: the
  push succeeds and the body begins falling on a following tick, by the normal
  falling rule. A body is never launched sideways through the air.
- **The kid walks into a falling gold star from the side**: it is collected
  normally. Falling only decides whether a body kills; it never blocks
  collection.
- **A cave whose quota is zero**: the door is open from the first tick.
- **A cave whose quota exceeds the number of gold stars in it**: rejected at
  parse time as malformed cave data, alongside the existing validations — an
  unwinnable cave is a data bug.
- **The player holds grab and a direction while the terminal state is
  showing**: nothing happens; only the restart key does anything once the cave
  has ended.
- **The player holds the direction key into a body they just pushed**: each
  tick is evaluated on its own and draws its own chance; the body advances at
  most one cell per tick, and only on the ticks where the push gives, for as
  long as the cell beyond it is empty.

## Requirements *(mandatory)*

### Functional Requirements

#### Falling

- **FR-001**: Erasers (boulders) and gold stars (diamonds) MUST fall when the
  cell directly below them is empty, moving exactly one cell per tick, and MUST
  keep falling for as long as that cell stays empty.
- **FR-002**: "Falling" MUST be part of cell state, carried with the body from
  tick to tick, and MUST NOT be recomputed from the surrounding cells at read
  time.
- **FR-003**: A body that begins to fall MUST be marked falling on the same
  tick it first moves down.
- **FR-004**: A falling body whose cell below is not empty and does not contain
  the kid MUST stop and MUST have its falling mark cleared on that tick.
- **FR-005**: A body MUST NOT be marked falling while it is at rest, and a body
  that has stopped MUST NOT kill anything (FR-010).
- **FR-006**: Falling MUST apply identically to erasers and gold stars. No other
  element falls in this feature.

#### Rolling

- **FR-007**: A body whose cell below contains an eraser, a gold star, or a
  cinder brick wall MUST roll to one side when both the cell on that side and
  the cell diagonally below that side are empty.
- **FR-008**: A body MUST NOT roll when the cell below contains anything else —
  specifically not a steel wall (locker), not notebook paper, not the kid, not
  the classroom door, and not any element that has no behavior yet.
- **FR-009**: The roll direction preference MUST be **left first**: the left
  side is tested, and only if it does not qualify is the right side tested. The
  preference is fixed, applies to every body, and MUST NOT consult randomness.
  A roll MUST move the body exactly one cell horizontally and MUST mark it
  falling, so that it continues downward on subsequent ticks.

#### Crushing and death

- **FR-010**: A **falling** body whose cell below contains the kid MUST kill the
  kid: the body takes that cell and the cave enters the death state. A body that
  is not falling MUST NEVER kill the kid.
- **FR-011**: Death MUST be the only failure state in this feature, and it MUST
  be reachable only through FR-010.

#### Pushing

- **FR-012**: When the player presses left or right into a cell containing an
  eraser, the cell immediately beyond the eraser in that same direction is
  empty, and the eraser is not falling, the push is *eligible*: the tick MUST
  resolve it by FR-015, and on success the eraser MUST move into that cell and
  the kid MUST move into the eraser's old cell.
- **FR-013**: A push MUST fail — leaving both the kid and the eraser where they
  are — when the cell beyond the eraser is anything other than empty, when it is
  outside the grid, or when the eraser is currently falling. Such a push is not
  eligible: it MUST fail deterministically and MUST consume nothing from the
  seeded generator, so that the random stream depends only on eligible pushes.
- **FR-014**: Erasers MUST NOT be pushable up or down, and gold stars MUST NOT
  be pushable in any direction. Pressing into a gold star collects it (FR-017)
  rather than pushing it.
- **FR-015**: An eligible push MUST require sustained pressure, resolved as a
  fixed per-tick chance drawn from the cave's own seeded generator: on each tick
  the push either gives — the eraser and the kid both move, within that single
  tick — or it does not, and nothing moves. The probability MUST be
  approximately **one in eight per tick** and MUST live in exactly one named
  constant, never repeated at a call site.
- **FR-016**: Exactly one draw MUST be taken per eligible push per tick, and no
  draw MUST be taken for any other reason in this feature. Push resolution is
  therefore the seeded generator's only consumer, and the sequence of push
  successes and failures MUST be a pure function of the cave's seed and the
  ordered inputs.

#### Collecting and the grab key

- **FR-017**: Moving into a cell containing a gold star MUST remove the star,
  place the kid in that cell, and increase the cave's collected count by exactly
  one.
- **FR-018**: The collected count MUST be part of cave state, MUST start at zero
  for every cave, and MUST be reproduced exactly by a replay of the same cave
  with the same inputs.
- **FR-019**: A grab modifier MUST be available as a held key. While it is held,
  a direction press MUST act on the neighbouring cell in that direction
  **without moving the kid**: notebook paper is cleared, a gold star is
  collected and counted, and every other cell content — empty, eraser, either
  wall, the classroom door open or closed, and the grid boundary — is left
  untouched.
- **FR-020**: Grab MUST NOT push an eraser and MUST NOT allow the kid to enter
  the classroom door.
- **FR-021**: The per-tick input handed to the simulation MUST carry, in
  addition to the optional direction of the previous feature, whether grab is
  held for that tick — so that a recorded input sequence still replays
  identically.

#### The quota and the classroom door

- **FR-022**: Every cave definition MUST declare a diamond quota as part of its
  data.
- **FR-023**: While the collected count is below the quota, the classroom door
  MUST behave exactly like a steel wall: the kid cannot enter it, nothing rolls
  off it, and it cannot be dug or destroyed.
- **FR-024**: While the door is closed it MUST be visually indistinguishable
  from a steel wall in every shipped theme.
- **FR-025**: When the collected count reaches the quota, the door MUST become
  enterable and MUST become visibly distinct and flashing. Reaching the quota is
  permanent for that cave — the door never closes again.
- **FR-026**: Moving into an open door MUST end the cave in the completed state.
  The door MUST remain impassable to everything other than the kid, and nothing
  MUST ever roll off it, open or closed.
- **FR-027**: Cave parsing MUST reject a cave whose declared quota exceeds the
  number of gold stars it contains, naming the cave and both numbers, and
  producing no partial grid — matching the existing parse-failure behavior.

#### Terminal states and restart

- **FR-028**: Cave state MUST carry a status of exactly one of: in play, dead,
  or completed.
- **FR-029**: Once the status is dead or completed, further ticks MUST leave the
  cave unchanged — nothing falls, nothing rolls, the kid does not move.
- **FR-030**: Each terminal state MUST be shown on screen with a message that
  identifies which one it is, and the page MUST remain responsive to input. A
  terminal state MUST NOT blank the cave, throw, or stop the render loop.
- **FR-031**: A restart key MUST rebuild the current cave from its definition —
  original layout, collected count back to zero, status back to in play, and the
  random generator reseeded from the cave's own seed — and MUST work both from a
  terminal state and during play.
- **FR-032**: A restarted cave MUST be indistinguishable from a freshly loaded
  one: rebuilding MUST go back to the cave definition itself, so that replaying
  the same inputs after a restart produces the same grid, collected count,
  status, and sequence of push outcomes as the first run.

#### Cave data

- **FR-033**: The shipped starter cave MUST grow into a real cave: it MUST
  contain erasers, gold stars, a declared quota, and exactly one classroom door,
  and MUST remain a hand-authored ASCII grid with parameters, changed with no
  edit to any simulation file.
- **FR-034**: The shipped cave MUST be winnable and MUST NOT kill or trap the
  kid at tick zero: no body starts directly above the kid with an empty cell
  between them, and the door is reachable once the quota is met.
- **FR-035**: The shipped cave MUST contain at least one more gold star than its
  quota, so a player can make a mistake and still finish.
- **FR-036**: The cave dimensions, the quota, and the seed MUST all come from
  cave data. No simulation, rendering, or test code may hardcode any of them.

#### Rendering and themes

- **FR-037**: The renderer MUST draw erasers and gold stars from their theme
  entries, with no appearance written at a drawing site and no branching on
  which theme is active.
- **FR-038**: The theme contract MUST gain whatever fields are needed to express
  the door's two appearances (closed — identical to the steel wall entry — and
  open/flashing), the two terminal-state messages, and any wording the
  collected/quota readout needs (FR-041). Rendering logic MUST NOT special-case
  an element or a theme to achieve any of them.
- **FR-039**: The flashing of the open door MUST be produced entirely in the
  rendering layer from its own frame timing. The simulation MUST NOT own an
  animation phase, and the door's flashing MUST NOT affect simulation state.
- **FR-040**: The Classroom theme MUST present erasers as erasers and gold stars
  as gold stars, and MUST supply the door, terminal-state, and readout entries
  above.
- **FR-041**: A minimal on-screen readout MUST show the collected count against
  the cave's quota, updating as stars are collected. It MUST show nothing beyond
  those two numbers and their themed wording, and it MUST read the count and the
  quota through the read-only accessors of FR-043 rather than tracking them
  itself. This readout is explicitly provisional: the arcade-shell HUD feature
  is free to move, restyle, or replace it outright.
- **FR-042**: Adding a further theme MUST still require only a new entry in the
  theme registry — no simulation change and no drawing-logic change.

#### Read-only access for the shell

- **FR-043**: The simulation MUST expose, as read-only accessors: the collected
  count, the cave's quota, whether the door is open, the cave status, and
  whether the body in a given cell is falling. Nothing outside the simulation
  may write any of them.
- **FR-044**: The simulation MUST still contain no wall-clock time, no page or
  browser access, and no randomness other than its own seeded generator.

#### Tests

- **FR-045**: Every rule above that changes the grid MUST be pinned by an ASCII
  cave test — a starting grid, a tick count and optional per-tick inputs, and
  the expected grid — and failures MUST still print readable side-by-side ASCII.
- **FR-046**: The suite MUST cover, at minimum, each of the following as its own
  case:
  - a body falling one cell, and continuing to fall over several ticks;
  - a body stopping on notebook paper, on a wall, and on another body;
  - a body rolling off another body, and off a cinder brick wall;
  - a body **not** rolling off a steel wall and **not** rolling off notebook
    paper;
  - a body not rolling because the diagonally-below cell is occupied while the
    side cell is empty;
  - the left-first roll preference, in a position where both sides qualify;
  - a falling body killing the kid;
  - a resting body directly above the kid not killing them over many ticks;
  - a falling gold star killing the kid;
  - a successful push under a seed and input sequence that make it succeed, a
    push blocked by each kind of obstruction, a rejected vertical push, and a
    rejected push of a falling eraser;
  - an eligible push held for many ticks under a fixed seed, producing an
    identical sequence of successes and failures on every run;
  - a blocked push — beyond-cell occupied, beyond-cell off-grid, and eraser
    falling — consuming **no** randomness: the generator's state after the
    blocked push is the same as if the player had pressed nothing, and a later
    eligible push therefore lands on the same tick either way. This is the
    subtle one, and the one most likely to rot;
  - a pushed eraser that then falls because nothing is under its new cell;
  - collecting a gold star by walking into it, and by grabbing it;
  - grabbing notebook paper without moving, and grab doing nothing against an
    eraser, a wall, the door, and the cave boundary;
  - the door being solid below quota and enterable at quota, and entering it
    completing the cave;
  - a cave whose quota exceeds its gold stars being rejected at parse time;
  - both terminal states freezing the cave across further ticks;
  - a restart mid-play and a restart from each terminal state, each followed by
    the same input sequence, producing the same grid, count, status, and push
    outcomes as the original run;
  - a stack of bodies resolving across several ticks because of scan order —
    the case that would silently break if the scan were made simultaneous.
- **FR-047**: The suite MUST continue to run with no browser, canvas, audio
  device, or browser-automation tooling.

#### Non-regression

- **FR-048**: Every rule and every test from feature 001 MUST still hold
  unchanged: one-cell grid-locked movement, digging notebook paper, both wall
  types and the grid boundary blocking the kid, the fixed scan order and
  moved-this-tick flag, determinism of replays, the single self-contained page
  that runs from `file://`, and the scrolling camera. This feature adds rules;
  it changes none of them.
- **FR-049**: Determinism MUST extend to everything added here: the same cave,
  seed, and ordered inputs MUST produce an identical grid, collected count,
  status, and sequence of push outcomes after any number of ticks.

### Key Entities

- **Falling mark**: Per-cell state saying that the body in this cell is in
  motion downward. Set when a body starts falling or rolls, cleared when it
  comes to rest. The single fact that separates a hazard from furniture.
- **Roll surface**: The closed set of cell contents a body will roll off —
  eraser, gold star, cinder brick wall. Everything else supports a body without
  letting it roll.
- **Collected count**: How many gold stars the kid has taken in this cave. Part
  of cave state, starts at zero, reproduced exactly by a replay.
- **Quota**: The number of gold stars a cave requires before its door opens.
  Cave data, not code.
- **Cave status**: In play, dead, or completed. Part of cave state; the two
  terminal values stop the cave advancing.
- **Grab input**: Whether the grab modifier is held for a given tick. Travels
  with the direction as part of the per-tick input, so replays include it.
- **Classroom door**: The exit element, in one of two conditions — closed
  (indistinguishable from a locker in both behavior and appearance) or open
  (enterable by the kid, flashing, still impassable to everything else).
- **Push chance**: The fixed per-tick probability, roughly one in eight, that an
  eligible push gives way. One named constant, drawn from the cave's seeded
  generator, and that generator's only consumer in this feature.
- **Collected/quota readout**: A provisional on-screen pair of numbers, worded
  from theme data, that the arcade-shell HUD is expected to replace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Digging the support out from under an eraser makes it fall on the
  next tick, in 100% of attempts.
- **SC-002**: A falling body that reaches the kid ends the cave in the death
  state in 100% of attempts; a resting body directly above the kid ends it in 0%
  of attempts, verified over at least 100 ticks of standing still.
- **SC-003**: A body resting on a roll surface with both a clear side and a
  clear diagonal rolls in 100% of attempts, and rolls left whenever both sides
  qualify, in 100% of attempts.
- **SC-004**: A body resting on a steel wall or notebook paper rolls in 0% of
  attempts, regardless of what is beside it.
- **SC-005**: A push into any non-empty cell, a vertical push, and a push
  against a falling eraser each succeed in 0% of attempts and consume 0 draws
  from the seeded generator. An eligible push succeeds on roughly one tick in
  eight and succeeds within 40 ticks of held pressure in essentially every
  attempt, and — for a given seed and input sequence — succeeds on exactly the
  same ticks on 100% of runs.
- **SC-006**: Walking into a gold star collects exactly one star and increases
  the count by exactly one, in 100% of attempts; the count never changes by any
  other amount.
- **SC-007**: The classroom door is enterable in 0% of attempts below quota and
  100% of attempts at or above quota, and entering it completes the cave in 100%
  of attempts.
- **SC-008**: Grabbing in a direction moves the kid in 0% of attempts, while
  clearing paper or collecting a star in 100% of the attempts where that is what
  the neighbouring cell holds.
- **SC-009**: The same cave replayed with the same recorded inputs produces an
  identical grid, collected count, status, and sequence of push outcomes on 100%
  of runs, over a sequence of at least 100 ticks that includes falls, rolls, a
  held push, a blocked push, a collection, and a death.
- **SC-010**: Both terminal states leave the page responsive and the cave
  visible, and the restart key returns the cave to its exact starting state — a
  restarted cave replays identically to a freshly loaded one — in 100% of
  attempts.
- **SC-011**: The automated suite passes with no browser present and covers
  every case listed in FR-046.
- **SC-012**: Every feature-001 test still passes unchanged, and the build still
  emits exactly one self-contained page that makes zero network requests.
- **SC-013**: A full cave of falling and rolling bodies holds the frame rate
  target on a mid-range laptop at the full cave size — 60 frames per second
  target, never below 30 — with no per-tick allocation growth over a long run.
- **SC-014**: Introducing a second theme still changes only theme data — zero
  simulation files and zero drawing-logic files — including the door's two
  appearances, the terminal-state messages, and the readout's wording.
- **SC-015**: The collected/quota readout matches the simulation's collected
  count and quota after every tick, in 100% of attempts, and its wording comes
  entirely from theme data.

### Verified by the maintainer at review time

The following cannot be checked without a browser and are called out here so
review knows what to look at:

- Falling feel: bodies drop at a cadence that reads as weight rather than
  teleporting or drifting, at the tick rate settled in feature 001.
- Push feel: whether the roughly one-in-eight per-tick chance (FR-015) reads as
  weight rather than as an unresponsive control. The constant is the dial; the
  spec fixes the mechanism, not the exact number.
- The death moment reads clearly: it is obvious *what* killed the kid and that
  the game has stopped on purpose.
- The closed door is genuinely indistinguishable from a locker at the shipped
  cell size, and the open door's flash is eye-catching without being painful.
- The reworked starter cave teaches the mechanics in a sensible order and is
  winnable by a person who has never played it, without being trivial.
- The collected/quota readout is legible at the shipped scale and does not
  crowd or obscure the cave — it is meant to be the smallest thing that makes
  the win condition visible while reviewing by playing.
- Frame rate holds with many bodies falling at once (SC-013).

## Assumptions

- The chosen roll preference is **left first** (FR-009). The issue asked for a
  consistent preference to be picked and documented; this is that pick. Because
  the scan runs left-to-right, a body rolling left lands in an already-scanned
  cell and therefore resumes on the following tick — the scan-order behavior the
  project deliberately preserves.
- A roll is a one-cell **horizontal** move that marks the body falling, not a
  diagonal move. The body descends on the next tick by the ordinary falling
  rule.
- A falling body kills on the tick it moves into the kid's cell, regardless of
  how far it has already fallen. There is no minimum drop distance.
- Explosions are not part of this feature, so a body that kills the kid simply
  occupies the cell. No cells around the kid are destroyed and nothing is
  converted to gold stars.
- The grab modifier is a held key alongside the existing direction keys; the
  exact key is a maintainer choice at review, and the input layer reports it per
  tick exactly as it already reports direction. The restart key is likewise a
  maintainer choice.
- Grab plus a direction that is not adjacent to anything actionable is a no-op,
  not an error.
- The classroom door is a single cell. Caves with more than one door are not
  supported and none ships.
- The quota is expressed as a count of gold stars, not a score. Collecting past
  the quota is allowed and has no effect other than raising the count, because
  there is no score in this feature.
- The reworked starter cave replaces the feature-001 starter cave rather than
  shipping alongside it. There is still exactly one cave; cave progression is a
  later feature.
- Push resolution (FR-015) is the seeded generator's first and only consumer.
  The one-in-eight figure is the answer to the clarification on push cost; it is
  a starting value in a single named constant, tunable at review by the feel
  judgement above without touching any rule.
- A failed push is not remembered. There is no accumulating effort: each tick
  draws afresh, so releasing and re-pressing the direction key costs the player
  nothing and gains them nothing.
- The tick rate, camera behavior, and single-file build are inherited from
  feature 001 unchanged and are not re-decided here.
- Sound is not part of this feature even though falling and collecting are the
  obvious places for it; audio arrives with its own feature and its own theme
  fields.

## Out of Scope

Named explicitly in the originating request: fireflies and butterflies,
explosions, the amoeba, the magic wall, the countdown timer, score, lives, and
multiple caves. Also out of scope here: the expanding wall, additional themes
beyond Classroom, the theme selector, the arcade shell and its real HUD, cave
progression, sound, touch controls, gamepad support, and any persistence. The
elements with no behavior yet stay inert exactly as they are today.

### Deliberately at the edge of scope

- The collected/quota readout (FR-041) is a minimal piece of HUD pulled forward,
  and only so that a cave's win condition is visible to whoever reviews the next
  several features by playing them. It shows the two numbers and nothing else —
  no score, no timer, no lives, no layout ambition — and it is provisional: the
  arcade-shell feature owns the real HUD and may move, restyle, or replace this
  outright. Its wording is theme data (FR-038), like every other appearance
  concern.
- The restart key (FR-031) is the other piece of the arcade shell pulled
  forward, and only because the constitution requires a cave restart to always
  be one key away. Lives, retry-on-death, and game-over are not included.
