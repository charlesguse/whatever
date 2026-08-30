# Feature Specification: Foundation — Cave Grid, Deterministic Tick, Themed Renderer, Digging Player

**Feature Branch**: `spec-draft/001-foundation-cave-grid`

**Created**: 2026-08-30

**Status**: Draft

**Input**: GitHub issue #1 — "Foundation: cave grid, deterministic tick, themed renderer, and a kid who digs"

The floor of Recess Rocks: a project that builds to a single self-contained
page, a cave a player can walk and dig around in, and the test harness every
later physics feature will lean on. Deliberately no falling rocks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dig around the starter cave (Priority: P1)

A player opens the game and sees a cave: a kid with a backpack standing in a
field of notebook paper, walled in by lockers. Pressing an arrow key (or WASD)
moves the kid exactly one cell in that direction, and holding the key keeps
them walking a cell at a time. Walking into notebook paper tunnels through it,
leaving an empty corridor that stays dug. Walking into a wall does nothing —
the kid stays put. Movement is crisp, one-cell, grid-locked steps; it never
slides or interpolates between cells. The cave is bigger than the window shows,
so the view scrolls along to keep the kid on screen and stops at the cave's
edges.

**Why this priority**: This is the entire visible product of this feature. If
only this ships, there is a thing on screen a person can play with, and every
later mechanic is an addition to it rather than a rewrite.

**Independent Test**: Open the page, press each of the four direction keys, and
confirm the kid steps one cell per step, clears dirt, leaves corridors behind,
and is stopped by both wall types. Then hold a key and confirm the kid keeps
walking at a steady cadence, and walk toward a far corner to confirm the view
scrolls along and stops at the cave boundary.

**Acceptance Scenarios**:

1. **Given** the kid is standing next to an empty cell, **When** the player
   presses the direction key toward it, **Then** the kid occupies that cell and
   the cell they left becomes empty.
2. **Given** the kid is standing next to a dirt cell, **When** the player
   presses the direction key toward it, **Then** the dirt is removed, the kid
   occupies that cell, and the cell remains empty for the rest of the session.
3. **Given** the kid is standing next to a brick wall, **When** the player
   presses the direction key toward it, **Then** the kid does not move and the
   wall is unchanged.
4. **Given** the kid is standing next to a steel wall, **When** the player
   presses the direction key toward it, **Then** the kid does not move and the
   wall is unchanged.
5. **Given** the kid is adjacent to the edge of the cave, **When** the player
   presses the direction key toward the edge, **Then** the kid does not leave
   the grid.
6. **Given** the player holds a direction key down, **When** several ticks
   elapse, **Then** the kid advances one cell per tick for as long as the key
   is held, in whole-cell steps only — never a partial cell, never diagonally,
   and at the same cadence on any machine.
7. **Given** the kid walks toward a part of the cave that is off screen,
   **When** they cross out of the middle of the view, **Then** the view scrolls
   to follow them, and stops scrolling at the cave's boundary rather than
   showing space outside the cave.

---

### User Story 2 - Play it from a file on disk (Priority: P2)

Someone is handed the built page as a file. They double-click it. The game
loads and plays with no web server, no internet connection, and no install
step. Nothing is fetched from anywhere.

**Why this priority**: This is the project's non-negotiable shipping shape and
the thing that unblocks the currently no-op Pages deploy. It is separable from
Story 1 — the game could work in a dev server and fail this — so it is tested
on its own.

**Independent Test**: Run the build, open the emitted file directly from the
filesystem with no server running and the network disabled, and confirm the
cave renders and responds to the keyboard.

**Acceptance Scenarios**:

1. **Given** a completed build, **When** the maintainer inspects the output
   directory, **Then** there is one self-contained page file with no sibling
   script, style, image, font, or audio files it depends on at play time.
2. **Given** the built page opened directly from disk with no server, **When**
   it loads, **Then** the starter cave is visible and immediately accepts
   keyboard input, with no click-to-start or configuration step.
3. **Given** the built page opened with the network unavailable, **When** it
   loads and is played, **Then** it makes zero outbound requests and behaves
   identically.

---

### User Story 3 - Behavior pinned by ASCII cave tests (Priority: P2)

A contributor writes a test as a small ASCII drawing of a cave, a number of
ticks, and the ASCII cave they expect afterward. The suite runs with no
browser, no canvas, and no audio. Replaying the same cave with the same inputs
always produces the same grid, so a failure means a rule changed, never that
the run was unlucky.

**Why this priority**: Every later physics rule is required to ship a test in
exactly this shape, so the ergonomics of this harness set the cost of all
future work. It is independently valuable: the harness and determinism can be
verified with no renderer at all.

**Independent Test**: Run the suite in a plain terminal (no browser present),
and confirm it covers grid construction, cave parsing, each movement
interaction, and a replay that asserts two identical runs produce identical
grids.

**Acceptance Scenarios**:

1. **Given** an ASCII cave literal in a test, **When** the harness builds a
   grid from it, **Then** each character maps to the element the shared
   character mapping declares.
2. **Given** a starting ASCII cave, a tick count, and an expected ASCII cave,
   **When** the assertion fails, **Then** the failure output shows the actual
   and expected caves as readable ASCII grids, not raw numbers.
3. **Given** the same starting cave, the same seed, and the same input
   sequence, **When** the simulation is run twice, **Then** both runs produce
   an identical grid at every tick.
4. **Given** the test environment has no browser, canvas, or audio device,
   **When** the suite runs, **Then** it completes without needing any of them.

---

### User Story 4 - Classroom appearance comes from a theme table (Priority: P3)

Everything on screen is looked up from a theme table keyed by element id:
notebook paper for dirt, cinder brick for brick wall, locker doors for steel
wall, a kid with a backpack for the player. Only the Classroom theme ships
here, but a future theme is a new data entry and nothing else.

**Why this priority**: Only one theme is visible now, so the player-facing
value is small — but the constraint has to hold from the first line of drawing
code, because retrofitting it later means rewriting the renderer.

**Independent Test**: Search the drawing code for literal colors, glyphs, and
labels; confirm every one comes from the theme table, and that the Classroom
theme has an entry for every declared element id.

**Acceptance Scenarios**:

1. **Given** the renderer draws a cell, **When** its appearance is determined,
   **Then** every color, glyph, and label used comes from the theme entry for
   that cell's element id.
2. **Given** the complete declared element set, **When** the Classroom theme is
   inspected, **Then** it has an entry for every element id, including the ones
   with no behavior yet.
3. **Given** a hypothetical second theme, **When** it is added, **Then** no
   file in the simulation and no drawing logic needs to change.

---

### Edge Cases

- **Cave data is malformed**: rows of unequal length, a row count or column
  count that disagrees with the cave's declared dimensions, an unrecognized
  character, zero players, or more than one player. Each is rejected at parse
  time with a message naming the cave and the offending coordinates — never
  silently repaired, never a half-built grid.
- **A player at the grid edge in a cave without a solid border**: the bounds
  check, not the border decoration, is what stops the player leaving the grid.
- **Conflicting keys held at once** (e.g. left and right, or up and left): the
  resolution is fixed and deterministic — most recently pressed still-held
  direction wins — so replays cannot diverge on it. Releasing that key while
  another direction is still held resumes movement in the still-held direction.
- **A key tapped and released entirely between two ticks**: the step still
  registers; the shell hands the simulation the most recent direction pressed
  since the last tick, so fast taps are not swallowed.
- **The browser tab is backgrounded and later restored**: accumulated time is
  clamped so the simulation does not burst-run a large batch of catch-up ticks
  and teleport the player across the cave.
- **The window is smaller than the cave** — the ordinary case at 40 by 22 — **or
  is resized while playing**: the view scrolls to follow the player and adapts
  to the new size without distorting cells into non-square shapes and without
  changing simulation behavior. A cave small enough to fit entirely is centered
  and does not scroll.
- **The player walks into a corner of the cave**: the camera stops at the
  boundary, so the player is off-center near the edges and no space outside the
  cave is ever drawn.
- **A cave contains an element that has no behavior yet** (e.g. a boulder): it
  is placed as an inert cell and drawn from its theme entry; it does not move
  and does not crash the tick. The shipped starter cave uses only the elements
  that have behavior.
- **The player presses a key before the first tick has run**: the input is
  buffered and applied on the first tick rather than lost.

## Requirements *(mandatory)*

### Functional Requirements

#### The grid and its elements

- **FR-001**: The cave MUST be represented as a fixed-size rectangular grid in
  which every cell holds exactly one element identity.
- **FR-002**: The element vocabulary MUST declare the complete set named by the
  constitution — empty, dirt, boulder, diamond, brick wall, steel wall, player,
  firefly, butterfly, amoeba, magic wall, expanding wall, exit, and explosion —
  with only empty, dirt, brick wall, steel wall, and player given behavior in
  this feature.
- **FR-003**: An element that has no behavior yet MUST be placeable in a cave
  as an inert cell: it is drawn, it is never moved by the tick, and it does not
  cause an error.
- **FR-004**: Cell state MUST include a per-cell "already moved this tick" flag
  that is cleared at the start of every tick.
- **FR-005**: The grid MUST expose read-only access to cell contents and to the
  player's position for the renderer, and MUST NOT be mutable from outside the
  simulation.

#### The tick

- **FR-006**: The cave state MUST advance only through a tick operation that
  takes the current grid and the pending input for that tick and produces the
  next state. Nothing else may change cave state.
- **FR-007**: Each tick MUST scan cells in a fixed top-to-bottom,
  left-to-right order, and MUST NOT process a cell twice in one scan.
- **FR-008**: The simulation MUST NOT read wall-clock time, MUST NOT access the
  page or any browser API, and MUST NOT use any source of randomness other than
  a seeded pseudo-random generator that the simulation itself owns.
- **FR-009**: The generator's seed MUST come from the cave data, so a cave
  always starts from the same random stream.
- **FR-010**: Running the same starting cave with the same seed and the same
  ordered list of inputs MUST produce an identical grid after any number of
  ticks, on every run and in any environment.

#### The player

- **FR-011**: A cave MUST contain exactly one player, and the simulation MUST
  move the player at most one cell per tick.
- **FR-012**: The player MUST be able to move in four directions — up, down,
  left, right — and MUST NOT move diagonally.
- **FR-013**: Moving into an empty cell MUST place the player there and leave
  the vacated cell empty.
- **FR-014**: Moving into a dirt cell MUST remove that dirt, place the player
  there, and leave the vacated cell empty. The removal is permanent.
- **FR-015**: Moving into a brick wall or a steel wall MUST leave the player
  and the wall unchanged.
- **FR-016**: The player MUST NOT move outside the grid, regardless of what the
  cave's border is made of.
- **FR-017**: With no input for a tick, the player MUST NOT move.

#### Input

- **FR-018**: Both the arrow keys and WASD MUST map to the same four
  directions, and MUST be usable interchangeably in the same session.
- **FR-019**: The shell MUST deliver to the simulation, for each tick, either
  one direction or nothing — the most recent direction pressed since the last
  tick, so a key tapped between ticks is not lost.
- **FR-020**: When conflicting directions are held simultaneously, the most
  recently pressed still-held direction MUST win, deterministically.
- **FR-021**: When a direction key is held continuously, the player MUST keep
  moving one cell per tick, at the simulation's tick rate, for as long as the
  key is held — no initial delay and no release-and-re-press requirement.
  - The held direction MUST be tracked by the input layer from key-down and
    key-up events and reported to the simulation as the per-tick direction of
    FR-019. No repeat timer or key-repeat state may live in the simulation, so
    a recorded list of per-tick directions replays identically.
  - The operating system's own key-repeat MUST NOT be used as the cadence,
    since OS repeat rates vary per machine and would make the game move at
    different speeds on different computers.
- **FR-022**: Keys the game uses for movement MUST NOT also scroll or
  otherwise act on the page while the game has focus.

#### Rendering

- **FR-023**: Drawing MUST run on its own loop at a fixed timestep, separate
  from and independent of the tick loop, and MUST read simulation state without
  modifying it.
- **FR-024**: Every visual attribute of a cell — color, glyph, label — MUST be
  looked up from a theme table keyed by element id. No color, glyph, or label
  may be written literally at a drawing site, and no drawing code may branch on
  which theme is active.
- **FR-025**: A theme entry MUST supply, for each element id, at minimum a
  fill color, a glyph, and a human-readable label, plus a cave background
  appearance for the theme as a whole.
- **FR-026**: The Classroom theme MUST ship with an entry for every declared
  element id, and MUST present dirt as notebook paper, brick wall as cinder
  brick, steel wall as a locker door, and the player as a kid with a backpack.
- **FR-027**: Adding a further theme MUST require only a new entry in the theme
  registry — no change to any simulation file and no change to drawing logic.
- **FR-028**: All graphics MUST be drawn in code (shapes, gradients, text
  glyphs). No image files, font files, or audio files may be used.
- **FR-029**: The view MUST be a scrolling viewport that follows the player, as
  in the original game, rather than fitting the whole cave on screen. The
  camera:
  - MUST live entirely in the rendering layer. The simulation MUST NOT be aware
    that a camera exists, and camera position MUST NOT be an input to a tick or
    affect simulation state in any way.
  - MUST follow the player using a dead zone in the middle of the view — the
    view scrolls only once the player moves out of that zone — rather than
    hard-centering the player on every step.
  - MUST clamp at the cave boundary: it never scrolls past an edge and never
    shows space outside the cave.
  - MUST, when the whole cave fits in the window, center the cave and not
    scroll at all.
- **FR-030**: Cells MUST be drawn as uniform squares, and the view MUST adapt
  to the window size without distorting cell shape. How much of the cave is
  visible MAY change with the window size; simulation behavior MUST NOT.

#### The cave format

- **FR-031**: Caves MUST be declarative data — a compact ASCII grid plus
  parameters (at least a name, dimensions, and a random seed) — and MUST NOT be
  expressed as code.
- **FR-032**: There MUST be exactly one character-to-element mapping, shared by
  shipped cave data and by tests, so a cave drawing means the same thing in
  both places.
- **FR-033**: Parsing a cave MUST validate that the grid is rectangular, that
  its size matches the declared dimensions, that every character is recognized,
  and that exactly one player is present — reporting the cave name and the
  offending coordinates on failure and producing no partial grid.
- **FR-034**: Exactly one hand-made starter cave MUST ship in that format, and
  it MUST be the cave shown when the page loads.
- **FR-035**: The starter cave MUST be enclosed by an indestructible border so
  the player cannot reach the grid edge in normal play.
- **FR-036**: The starter cave MUST be 40 cells wide by 22 cells tall — the
  original game's cave size, which the later caves standardize on. Every
  dimension MUST be read from the cave data: neither the simulation, the
  renderer, nor the test harness may hardcode 40 by 22 or assume all caves
  share one size, so a later cave of a different size needs no change outside
  cave data.
- **FR-037**: Adding or editing a cave MUST NOT require touching any
  simulation file.

#### The test harness

- **FR-038**: A helper MUST build a grid from an ASCII cave written inline in a
  test.
- **FR-039**: A helper MUST run a given number of ticks, optionally driven by a
  per-tick sequence of inputs.
- **FR-040**: A helper MUST convert a grid back to ASCII and compare it against
  an expected ASCII cave, reporting failures as side-by-side readable grids
  rather than raw cell values.
- **FR-041**: The suite MUST cover, at minimum: grid construction; cave parsing
  including each rejection case in FR-033; player movement into empty, dirt,
  brick wall, steel wall, and the grid boundary; a tick with no input; a
  sustained run of the same direction over consecutive ticks, standing in for a
  held key (FR-021); a cave whose dimensions differ from the starter cave's,
  proving no size is hardcoded (FR-036); and the determinism guarantee of
  FR-010 over a multi-tick input sequence.
- **FR-042**: The suite MUST run without a browser, a canvas, an audio device,
  or any browser-automation tooling.

#### Building and running

- **FR-043**: The build MUST emit a single self-contained page file that plays
  correctly when opened directly from the filesystem, and MUST make no network
  requests at play time.
- **FR-044**: The test command MUST run the whole suite and MUST be usable as
  the merge gate.
- **FR-045**: The build and the test suite MUST both pass in an environment
  with no browser installed.

### Key Entities

- **Element**: The identity of what occupies a cell. A fixed, closed set shared
  by the simulation, cave data, themes, and tests. Identity only — never
  appearance.
- **Cave definition**: The declarative description of a starting cave — a name,
  dimensions, a random seed, and an ASCII grid. Data, authored by hand.
- **Grid / cave state**: The live rectangular field of element cells plus the
  per-cell moved-this-tick flags, the player's position, the tick counter, and
  the random generator's state. The complete state the tick operates on.
- **Tick input**: For one tick, either a single direction or nothing. The only
  channel through which the outside world influences the simulation.
- **Random generator**: The simulation's own seeded source of randomness, whose
  state is part of cave state so replays reproduce it exactly. Declared and
  seeded here; nothing in this feature consumes it yet.
- **Camera**: The rendering layer's record of which part of the cave is on
  screen, derived each frame from the player's position, the cave's dimensions,
  and the window size. Purely a view concern — it is never read by the
  simulation and never influences a tick.
- **Theme**: A plain data table mapping every element id to appearance — fill
  color, glyph, label — plus a background for the cave. Classroom is the only
  entry in the registry for now.
- **Character mapping**: The single shared correspondence between ASCII
  characters and element ids, used by cave data and by test caves alike.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person handed the built page file can open it with no server,
  no install, and no connectivity, and be moving the kid within 10 seconds of
  opening it, with no instructions.
- **SC-002**: 100% of player movements land the kid exactly on a cell — every
  step is one whole cell in one of four directions, and the kid is never
  between cells or off the grid.
- **SC-003**: Walking into dirt clears exactly one cell and the corridor
  remains cleared for the rest of the session, in 100% of attempts.
- **SC-004**: Walking into either wall type or into the cave edge results in no
  movement, in 100% of attempts, with zero cases of leaving the grid.
- **SC-005**: The same cave replayed with the same recorded inputs produces an
  identical grid on 100% of runs, verified over a sequence of at least 100
  ticks.
- **SC-006**: The view holds a steady frame rate on a mid-range laptop at the
  full 40 by 22 cave size, including while the view is scrolling — 60 frames
  per second target, never below 30.
- **SC-007**: The automated suite passes in an environment with no browser and
  covers all of the cases listed in FR-041.
- **SC-008**: The shipped artifact is exactly one file and makes zero network
  requests from load through play.
- **SC-009**: Introducing a second theme changes only theme data — zero
  simulation files and zero drawing-logic files — confirmed at review.
- **SC-010**: Adding a new cave changes only cave data — zero simulation
  files — confirmed at review, including a cave whose dimensions differ from
  the starter cave's 40 by 22.
- **SC-011**: The view never shows space outside the cave and never scrolls
  past a boundary, in 100% of walks into each of the four edges and four
  corners.

### Verified by the maintainer at review time

The following cannot be checked without a browser and are called out here so
review knows what to look at:

- Movement feel: steps read as crisp and grid-locked, and the one-cell-per-tick
  cadence when a key is held feels like Boulder Dash rather than sluggish or
  runaway — which is the same judgement as the tick rate itself.
- Camera feel: the dead zone is wide enough that ordinary walking does not make
  the cave lurch, and narrow enough that the player never walks off screen;
  scrolling stops cleanly at the edges.
- The Classroom theme reads as school supplies at a glance — notebook paper,
  cinder brick, lockers, a kid with a backpack — at the shipped cell size.
- Frame rate holds at full cave size (SC-006), including after the tab has
  been backgrounded and restored.

## Assumptions

- The stack is the one the constitution fixes — Svelte 5 + Vite + TypeScript
  with single-file bundling, and vitest for the suite — so this spec does not
  re-decide it.
- The game starts directly in the starter cave on load. There is no title
  screen, menu, HUD, score, timer, or lives in this feature; those belong to
  the arcade shell feature.
- There is no failure state: the player cannot die, and there is nothing to
  collect and no way to finish the cave.
- The shipped starter cave uses only the five elements that have behavior
  (empty, dirt, brick wall, steel wall, player), so nothing on screen looks
  broken by standing still when it should not.
- The simulation runs at a fixed tick rate in the neighborhood of 8 ticks per
  second — the original game's rough cadence — with the exact value tuned by
  the maintainer at review; it is not a free-running rate tied to frame rate.
  Because a held key moves the player one cell per tick (FR-021), that tick
  rate is also the player's walking speed.
- The dead zone size and scroll behavior of the camera (FR-029) are tuning
  values for the maintainer to settle at review, not fixed by this spec; only
  the follow-with-a-dead-zone, clamp-at-the-edge, and center-if-it-fits rules
  are required.
- Ticks continue to advance while the player presses nothing; the simulation is
  not driven by input events.
- Keyboard is the only input mode here. Touch and gamepad support, which the
  constitution requires overall, are later features and their absence now is
  not a regression.
- No state is persisted; theme choice, high score, and progress persistence
  arrive with the features that create them.
- The random generator is established and seeded in this feature but has no
  consumer yet, because no element with random behavior is implemented.
- The existing GitHub Pages deployment is currently a no-op and starts serving
  a real page once this feature produces a build. No change to the deployment
  configuration itself is assumed to be needed.
- Contributors run the suite on a machine with no browser, matching CI.

## Out of Scope

Named explicitly in the originating request, each its own future feature:
falling or rolling boulders, diamonds, the exit, fireflies and butterflies, the
amoeba, the magic wall, the countdown timer, score, lives, sound, touch
controls, and gamepad support. Also out of scope here: additional themes beyond
Classroom, the theme selector, additional caves beyond the starter cave, cave
progression, and any persistence.
