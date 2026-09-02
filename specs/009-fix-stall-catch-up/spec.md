# Feature Specification: Drop The Tick Backlog On A Stall

**Feature Branch**: `spec-draft/009-fix-stall-catch-up`

**Created**: 2026-09-02

**Status**: Draft

**Input**: GitHub issue #26 — "Backgrounded tab fires a burst of stored-up sound
on restore": the manual listening pass on feature 008 (checklist item 11,
"Backgrounded tab") found a real burst of stored-up sound, reproduced by the
maintainer against `dist/index.html` at `bf9d316`. Play until a cave is
completed so the bonus-tally screen is showing, switch to another tab for a few
seconds, and switch back: instead of the tally continuing one step at a time,
there is a short loud blip — several tally voices sounding at the same instant —
before it settles. Feature 008's acceptance scenario 6 already required that
"no accumulated sounds fire at once and no error surfaces" when a hidden tab is
restored; 008 took that as satisfied on the strength of 005's note that the tick
loop already clamps catch-up. The clamp *bounds* the burst; it does not remove
it. When the loop resumes it runs up to five simulation ticks inside a single
frame, and every one of those ticks schedules its sounds at the same instant.
The tally screen is merely where it is most audible, because it is the only
screen that emits a sound on every tick — the same mechanism stacks fall and
explosion voices when the tab is hidden mid-collapse, so the fix must not be
scoped to the tally screen. The requested shape is to drop the backlog on a
stall rather than to filter audio on catch-up ticks: detect the stall from the
elapsed time the tick loop already sees rather than from a page-visibility
signal, so the same fix covers laptop sleep, garbage-collection pauses, and a
stopped debugger; and extract the rule as a pure, total function with a
node-only test, matching the idiom already used elsewhere in the shell, rather
than shipping an untested patch inside the app component.

This is a defect spec against feature 008, not a new capability. It changes one
rule — how much pending simulation time survives a frame gap — and it changes it
for every screen and every stall cause at once. Nothing about which sounds exist,
how they are voiced, how they are capped, or when they are derived changes here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coming back to a stalled game is quiet (Priority: P1)

A player finishes a cave and the bonus tally starts counting their leftover time
into their score, one audible step at a time. They switch to another tab to
answer a message, come back a few seconds later, and the tally is exactly where
they left it, still stepping one at a time. There is no blip, no chord of
stacked voices, no lurch — the game simply picks up where it stopped. The same
is true when they leave mid-cave during a five-boulder collapse: they come back
to the cave frozen where it was, and it resumes at its normal pace and normal
volume. It is also true after their laptop wakes from sleep and after the tab
freezes for a moment under a garbage-collection pause, because nothing about the
fix cares *why* the frame gap happened.

**Why this priority**: This is the defect. It is the whole feature, and every
other story in this spec exists to keep it from costing something else.

**Independent Test**: With no browser and no audio device, drive the pending-time
rule as a pure function over (pending time carried forward, time elapsed since
the previous frame) to the pending time that survives. A gap large enough to be
a stall yields zero pending time, so the frame that follows a stall runs no
catch-up ticks at all. Because the number of ticks a frame runs is a function of
that returned value alone, "at most one tick's worth of sound is scheduled per
frame after a stall" follows from the function's output without a renderer, an
audio device, or a page-visibility event.

**Acceptance Scenarios**:

1. **Given** the bonus-tally screen is animating, **When** the tab is hidden for
   several seconds and then restored, **Then** the tally resumes one step at a
   time from where it stopped, and no two tally voices sound at the same instant.
2. **Given** a cave in play with boulders falling, **When** the tab is hidden
   mid-collapse and then restored, **Then** no accumulated fall or explosion
   voices fire together, and the collapse resumes at its normal pace.
3. **Given** any screen at all — title, cave intro, playing, paused, life lost,
   cave complete, game over, won — **When** a stall is followed by a restore,
   **Then** the same rule applies; the behavior is not special-cased to the
   cave-complete screen or to any screen.
4. **Given** a stall caused by something other than a hidden tab — the machine
   sleeping and waking, a long garbage-collection pause, a debugger stopped at a
   breakpoint — **When** the loop resumes, **Then** the backlog is dropped
   exactly as it is for a hidden tab, because the rule reads elapsed time and
   nothing else.
5. **Given** a restored tab, **When** the loop resumes, **Then** nothing is
   logged, thrown, or shown to the player.
6. **Given** a stall of any length — one second, one minute, one hour — **When**
   the loop resumes, **Then** the number of catch-up ticks does not grow with the
   length of the stall.

---

### User Story 2 - The fix costs nothing in ordinary play (Priority: P2)

A player who never leaves the tab notices no difference whatsoever. Their frames
arrive at the usual rate, every tick runs when it should, and every sound that
was audible before is audible now — the boulder that lets go, the one that lands,
the diamond, the exit, the blast. On a slower machine that hiccups for a moment,
the game still catches the hiccup up rather than losing that moment. A player who
clicks on another window while leaving the game visible keeps playing: the game
does not pause, does not freeze, and does not drop a tick, because an unfocused
window still gets its frames and never builds a backlog at all.

**Why this priority**: The obvious wrong fix — muting the catch-up ticks — would
leave the visual lurch in place and would silence real events on ordinary stutter
frames, which feature 008's FR-042 forbids outright. This story is what makes the
fix a fix rather than a trade.

**Independent Test**: With no browser, assert the same pure function on the other
side of the boundary: a frame gap at or under the stall boundary yields its
pending time unchanged, so an ordinary stutter still runs the ticks it owes and
every one of those ticks still plays its sounds; and a normal frame's pending
time is byte-identical to what the current rule produces. Separately, assert
that the sound-event derivation and the voice cap from feature 008 are unchanged
by this feature — every existing test over them passes untouched.

**Acceptance Scenarios**:

1. **Given** a normally paced frame, **When** the rule runs, **Then** the pending
   time it returns is exactly what today's rule returns, and the simulation runs
   the same ticks it does today.
2. **Given** a brief stutter at or under the stall boundary, **When** the loop
   resumes, **Then** the owed ticks still run and every sound event those ticks
   produce is still played — no sound is suppressed, filtered, or downgraded on a
   catch-up tick.
3. **Given** a cave in play, **When** the window loses focus but stays visible,
   **Then** the game keeps running exactly as feature 005 requires — no backlog
   accumulates, no tick is dropped, and nothing about this feature engages.
4. **Given** a recorded cave and input sequence replayed in the existing
   node-only environment, **When** the suite runs, **Then** the resulting grids,
   scores, and derived sound events are identical to before this feature.
5. **Given** the cave-complete screen, **When** the tally animates without any
   stall, **Then** it produces exactly one tally sound per tick as it does
   today — the per-tick tally event is correct and is not changed by this
   feature.
6. **Given** a build of the game, **When** `dist/index.html` is inspected,
   **Then** it is still a single self-contained file with no new runtime
   dependency.

---

### User Story 3 - The rule is pinned by a test, not by a listening pass (Priority: P3)

A contributor who later touches the tick loop cannot silently reintroduce the
burst, because the rule that prevents it lives in one small, named, pure function
with its own test — the same shape the shell already uses for input merging,
touch-control visibility, audio availability, and the mute state machine. A
reviewer can read the rule without reading the frame loop around it, and the
suite fails if someone widens the stall boundary or restores the old clamp.

**Why this priority**: The constitution's Principle VII makes browser-free
verification mandatory, and the issue asks for this explicitly: the previous
attempt at this behavior was an assumption in a note, and it was wrong for a
year of specs because nothing pinned it. It is P3 only because it is a property
of the fix rather than something a player can see.

**Independent Test**: The function is importable and callable from a plain node
test with no DOM, no canvas, and no audio device, and it is total over its
inputs — every pair of numbers it can be handed, including a zero gap, a
negative or non-finite gap from a clock anomaly, and an enormous gap, returns a
finite, non-negative pending time.

**Acceptance Scenarios**:

1. **Given** the test suite in the existing node-only environment, **When** it
   runs, **Then** the stall rule is exercised directly at the normal frame case,
   the stutter case, the stall boundary itself, and beyond the boundary.
2. **Given** a hypothetical change that widens the stall boundary or removes the
   drop, **When** the suite runs, **Then** it fails.
3. **Given** the rule's inputs, **When** any pair of numeric values is supplied —
   including zero, a negative gap, and a non-finite gap — **Then** the result is
   finite and non-negative and the loop cannot be driven into an unbounded catch-
   up.
4. **Given** the shipped fix, **When** the diff is reviewed, **Then** the rule is
   not an inline expression inside the app component with no test of its own.

---

### Edge Cases

- **The very first frame**: the loop's first frame has no previous frame to
  measure against; it must produce no ticks and no sound, exactly as it does
  today, and must not be mistaken for a stall.
- **A stall while paused**: the pause screen produces no sound events today, so a
  stall across a pause is silent either way; the rule still applies, and resuming
  from pause is unaffected.
- **A stall that ends exactly at the boundary**: the boundary is stated in one
  direction, so a gap that lands exactly on it behaves the same way on every
  frame and in the test — no "sometimes catches up".
- **A stall during the cave clock**: the cave clock is counted in ticks, not in
  wall-clock time, so a stall does not consume the player's remaining time. A
  player who returns from a hidden tab finds the same seconds left as when they
  left, and this is the intended behavior — the game was frozen, so it should not
  have charged them for it.
- **Repeated short stalls**: a machine that stalls every few seconds drops each
  backlog independently and never accumulates one across stalls.
- **A clock that jumps backward**: a negative gap from a wall-clock or timestamp
  anomaly does not reduce pending time below zero and does not run a negative
  number of ticks.
- **A stall on the tally screen close to the end of the tally**: the tally
  resumes from where it stopped and still lands on its final value; dropping the
  backlog cannot skip the tally's ending or leave the score short.
- **Audio unavailable or muted**: with no audio device or with the game muted,
  the visible behavior on restore is the same — the game resumes rather than
  lurching through several ticks in one frame. The fix is about the ticks, not
  about the sound.

## Requirements *(mandatory)*

### Functional Requirements

**The rule**

- **FR-001**: The system MUST bound how much pending simulation time survives a
  gap between frames, such that a gap large enough to count as a stall leaves
  zero pending time and the frame that follows it runs no catch-up ticks.
- **FR-002**: The stall boundary MUST be stated as a fixed amount of pending
  simulation time. Pending time strictly greater than the boundary is a stall and
  is dropped in full; pending time at or below the boundary is carried and spent
  as ticks exactly as it is today. The default boundary is two tick intervals'
  worth of pending time. [NEEDS CLARIFICATION: is two tick intervals the right
  stall boundary — how much stutter should still catch up, given that at the
  game's tick rate a frame gap of more than one tick interval already means the
  frame rate has fallen below the constitution's floor?]
- **FR-003**: The rule MUST be driven by the elapsed time the tick loop already
  observes between frames, and MUST NOT depend on a page-visibility signal, a
  focus signal, or any other event that names one cause of a stall. Hiding a tab,
  a machine sleeping and waking, a garbage-collection pause, and a stopped
  debugger MUST all be handled by the same code path.
- **FR-004**: The rule MUST apply on every screen — title, cave intro, playing,
  paused, life lost, cave complete, game over, and won — and MUST NOT be
  conditioned on the current screen, on the cave-complete tally, or on any
  particular sound event.
- **FR-005**: The number of catch-up ticks that follow a stall MUST NOT grow with
  the length of the stall.
- **FR-006**: A frame gap at or under the boundary MUST run the ticks it owes,
  unchanged from today's behavior, and a normally paced frame MUST behave exactly
  as it does today.
- **FR-007**: The rule MUST be total over its inputs: a zero gap, a negative gap,
  and a non-finite gap MUST all produce a finite, non-negative pending time, and
  none of them may drive the loop into an unbounded number of ticks.
- **FR-008**: The existing accumulator clamp MUST NOT remain as a second,
  separately stated bound that can produce a different answer from the rule in
  FR-001. There is exactly one rule for how much pending time survives a frame.

**What must not change**

- **FR-009**: Sound events MUST NOT be suppressed, filtered, deduplicated across
  ticks, or downgraded because a tick is a catch-up tick. Feature 008's
  requirement that every sound event is audible stays intact; this feature
  removes the ticks, not the sounds.
- **FR-010**: The set of sound event ids, how each is derived from consecutive
  simulation states, the voice-cap priority order, and every theme's sound table
  MUST be unchanged by this feature.
- **FR-011**: The cave-complete tally MUST continue to produce its sound once per
  tick while that screen is showing. Re-deriving it from the rendered number is
  forbidden, as it would pull render state into event derivation.
- **FR-012**: Losing window focus while the window stays visible MUST continue to
  leave the game running, per feature 005 — that case builds no backlog, so this
  feature changes nothing about it.
- **FR-013**: No simulation rule, cell state, element behavior, or existing
  test's expected grid may change. The simulation stays a pure function of
  (grid, input, tick) and MUST NOT learn about wall-clock time or frame gaps.
- **FR-014**: The tick loop MUST remain a fixed-timestep loop decoupled from
  rendering, and the rule MUST NOT allocate per frame or per tick.
- **FR-015**: The player MUST NOT be shown, told, or logged anything when a stall
  is detected and its backlog dropped.

**Verification**

- **FR-016**: The rule MUST be expressed as a pure function of (pending time
  carried forward, time elapsed since the previous frame) returning the pending
  time that survives, importable and callable outside the app component, matching
  the pure-function-plus-node-test idiom the shell already uses for input
  merging, touch-control visibility, audio availability, and mute.
- **FR-017**: The rule MUST ship with tests in the existing node-only
  environment covering, at minimum: a normally paced frame, a stutter under the
  boundary that still spends its ticks, the boundary itself, a gap past the
  boundary that drops to zero, and the totality cases in FR-007.
- **FR-018**: The feature MUST NOT add browser-automation test infrastructure,
  and MUST NOT require a real canvas, audio device, or gamepad to verify the
  rule. The audible result on a real restore remains the maintainer's to confirm
  at review, per the listening note below.
- **FR-019**: Feature 008's listening-checklist item 11, "Backgrounded tab", MUST
  be re-run by the maintainer against this build and MUST pass.

### Key Entities

- **Pending simulation time**: the amount of simulated time owed but not yet
  spent as ticks, carried from frame to frame. It is the single value this
  feature governs; everything else about the loop is unchanged.
- **Stall**: a frame gap whose pending simulation time exceeds the stated
  boundary. It is defined by elapsed time alone and carries no information about
  its cause.
- **Stall boundary**: the fixed amount of pending simulation time above which the
  backlog is dropped in full. One value, stated in the spec, applied on every
  screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Hiding the tab on the bonus-tally screen for several seconds and
  returning produces no audible blip — the tally resumes one step at a time —
  confirmed by the maintainer re-running feature 008's listening-checklist item
  11 against `dist/index.html` opened via `file://`.
- **SC-002**: After a stall of any length, at most one tick's worth of sound is
  scheduled in the frame that follows, on every screen, enforced by a test over
  the pending-time rule rather than by listening.
- **SC-003**: The number of catch-up ticks after a stall is the same for a
  three-second stall and a three-minute stall.
- **SC-004**: Hiding the tab mid-collapse and returning produces no stacked fall
  or explosion voices, confirmed by the maintainer — demonstrating the fix is not
  scoped to the tally screen.
- **SC-005**: Every test that passed before this feature still passes unchanged,
  including all sim grid tests and all feature 008 sound-derivation, voice-cap,
  mute, and theme-table tests.
- **SC-006**: 100% of the cases in FR-017 are covered by node-only tests, and
  removing the drop or widening the boundary makes the suite fail.
- **SC-007**: Ordinary play is unchanged: on a machine holding the constitution's
  frame-rate bounds, no tick is dropped and no sound event is lost over a full
  eight-cave run.
- **SC-008**: `npm test` is green and `dist/` still holds exactly one
  self-contained `index.html`.
- **SC-009**: Zero errors, warnings, or banners reach the player across a hide,
  a restore, a sleep-wake, and a debugger pause.

## What the maintainer listens for and looks at

CI has no browser, so the restore itself is verified by hand at review time,
against `dist/index.html` opened via `file://`:

1. **Backgrounded tab on the tally** — feature 008's checklist item 11, the exact
   repro in the issue: complete a cave, switch away for a few seconds, switch
   back. The tally continues one step at a time. No blip.
2. **Backgrounded tab mid-collapse** — start a five-boulder collapse, switch away
   immediately, switch back. No chord of thuds, and the collapse finishes at its
   normal pace.
3. **Nothing lurches** — on restore, the board does not jump several ticks in one
   frame; it resumes.
4. **Sleep and wake** — close the laptop lid mid-cave, reopen it. Same behavior as
   the hidden tab, with no page-visibility handler involved.
5. **Focus without hiding** — click another window while the game stays visible.
   The game keeps running exactly as it does today; nothing freezes and nothing
   is dropped.
6. **Ordinary play is untouched** — play a full cave with sound on: every fall,
   land, chime, blast, and low-time beep is where it was, at the pace it was.
7. **Muted and silent platforms** — repeat the restore muted, and again with audio
   unavailable: the visible resume is identical.

## Assumptions

- **Stall boundary default**: pending simulation time greater than two tick
  intervals is a stall. At the game's eight-ticks-per-second rate that is a frame
  gap of roughly a quarter second — well past the constitution's frame-rate floor,
  so it cannot be reached by a machine that is keeping up, while still letting a
  brief hiccup catch itself up as the issue asks. Flagged in FR-002 as the one
  tuning call in this spec.
- **Dropped time is not owed back**: a stall freezes the game; the simulation does
  not fast-forward and does not replay the lost interval. The cave clock is
  counted in ticks, so a player returning from a stall keeps the time they had.
- **The existing five-interval clamp folds into the new rule**: it was the
  previous, weaker answer to the same question, and FR-008 requires exactly one
  rule; whether it disappears or becomes an internal detail of the new function is
  a planning call, as long as the observable behavior is the one this spec states.
- **The dropped backlog is invisible on non-playing screens**: title, cave intro,
  life lost, game over, and won advance on a tick counter, so a stall on those
  screens simply delays the auto-advance by the stalled interval, which is the
  same thing the player already experiences today.
- **No new persisted state, no new input, no new theme field**: this feature adds
  nothing to the save record, no binding, and no theme data.
- **Feature 005's edge-case note is superseded, not contradicted**: the claim that
  "the tick loop already clamps catch-up so a backgrounded tab cannot fire a burst
  of ticks" was true about the bound and wrong about the burst. This spec replaces
  that reasoning; no feature 005 behavior other than the accumulator bound changes.
- **Scope is the tick loop's pending-time rule only**: not the sound system, not
  the tally, not the simulation, not the renderer, and not window focus handling.
