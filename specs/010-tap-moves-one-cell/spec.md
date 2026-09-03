# Feature Specification: One Tap, One Cell

**Feature Branch**: `spec-draft/010-tap-moves-one-cell`

**Created**: 2026-09-03

**Status**: Draft

**Input**: GitHub issue #30 — "Tapping a movement key usually moves two cells,
not one". Reported by the maintainer during the 005/007 manual passes: *"It is
hard to only move one square on the keyboard. It almost always wants to move two
squares when I try to tap a movement key, regardless of whether it's WASD or
arrow keys."* The issue reproduces the fault by inspection and establishes that
the mechanism is deterministic rather than a stray double event: a held
direction is re-reported on every tick with no repeat delay, and at the game's
tick rate one tick is 125 ms, so a comfortable human tap (roughly 80–150 ms)
usually straddles two tick boundaries and yields two moves. OS key-repeat is
already excluded and is not the cause; the sim is faithfully moving one cell per
tick per direction and is being handed the direction twice. The issue asks the
spec to settle the trade-off between a repeat delay (tap becomes reliably one
cell, at the cost of a perceptible hitch at the start of held movement) and no
delay (perfectly smooth held movement, at the cost of fine positioning being
genuinely difficult — and fine positioning is fatal-or-not in this game), rather
than picking silently; and to state explicitly whether the chosen rule applies
to all three input sources or only the keyboard, since touch and gamepad hold
the same "held direction repeats every tick" shape.

This is a control-feel defect in the shell, not a physics change. Nothing in
this feature touches the simulation: the sim keeps taking one direction-or-
nothing per tick and keeps moving exactly one cell per tick per direction. All
that changes is how many ticks a single press is allowed to speak for.

## Why this is worth a spec

The constitution's fidelity goal ("mechanical fidelity first") and its playability
goal are in genuine tension here, and the tension is a consequence of this
project's own numbers rather than of the original game's design:

- The sim runs at 8 Hz, so one tick is **125 ms**.
- A deliberate human tap is roughly **80–150 ms**.
- Today a press speaks on every tick it is observed down, so a tap that is
  observed down at two tick boundaries produces two moves.

Because tick phase is arbitrary relative to when the player presses, the same
tap is one cell or two depending on nothing the player can perceive or control.
That non-determinism *from the player's point of view* is the defect. The
arcade originals ran their scan faster, so the same "no repeat delay" rule felt
fine there and does not here. Choosing a repeat delay is therefore not an
"improvement" to a canonical rule under Principle II — the canonical rules
govern what the cave does with a direction, not how many ticks one key press is
worth.

## Clarifications

Both open questions were answered by the maintainer on issue #30 and are folded
into the requirements below.

- **How long is the repeat delay? → One tick interval (125 ms).** A press moves
  on the first tick that observes it, is suppressed for one tick, and repeats
  every tick after that. Every press released within 250 ms is exactly one cell
  at any tick phase — a comfortable margin over the 80–150 ms human tap, chosen
  because a marginal fix is not a fix when being one cell off under a boulder is
  fatal. A two-tick delay was rejected: its 250 ms hitch would be felt on every
  corridor crossing, and the extra coverage it buys is beyond any press a player
  intends as a tap. Doing nothing was rejected because the defect is not that
  fine positioning is *hard* — it is that the same gesture yields one or two
  cells depending on a tick phase the player can neither perceive nor control.
  The delay is stated in tick intervals, never milliseconds (FR-003), and is
  resolved by a pure tick-counting function with no wall-clock reads (FR-017).
- **Which input sources? → All three.** Keyboard, touch d-pad, and gamepad
  d-pad and stick (FR-004). Principle V has no exception for the devices that
  are harder to test, and shipping the fix on one path would guarantee a
  follow-up issue. The rule is one shared unit that all three call, not three
  copies (FR-018). Gamepad *manual* verification is deferred for want of
  hardware and is carried as an explicit unchecked item in the maintainer
  checks; the gamepad requirement and its node-level test are not deferred.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One tap, one cell (Priority: P1)

A player needs to nudge the kid exactly one cell to the right so they are clear
of a boulder that is about to fall. They tap the right arrow the way anyone taps
a key — press, release, no counting. The kid moves exactly one cell. They tap
again: one more cell. They can place the kid on any specific cell they choose,
first try, without watching a clock or learning a rhythm.

**Why this priority**: This is the reported defect and the entire point of the
feature. Everything else in this spec exists to make sure fixing it does not
break something that already works.

**Independent Test**: With no browser, drive the direction reporter as a pure
function over an interleaved sequence of press events, release events, and
per-tick reads. For every tap that no more than two consecutive ticks observe
down — including a tap that spans zero tick boundaries, one tick boundary, and
two tick boundaries — assert the sequence of reported directions contains
exactly one move. Sweep the tap across every tick phase; the count never
changes.

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the player presses and releases a
   direction control entirely between two ticks (no tick observes it down),
   **Then** exactly one move in that direction is reported — the existing
   guarantee, unchanged.
2. **Given** a cave in play, **When** the player presses a direction control and
   releases it after one tick has observed it down, **Then** exactly one move is
   reported.
3. **Given** a cave in play, **When** the player presses a direction control and
   releases it after two consecutive ticks have observed it down, **Then** still
   exactly one move is reported — the second tick is the suppressed one.
4. **Given** a cave in play, **When** a tap is repeated at every possible offset
   relative to the tick boundary, **Then** every repetition reports the same
   number of moves — the reported count does not depend on tick phase.
5. **Given** a cave in play, **When** the player taps a direction three times in
   a row, **Then** the kid ends up exactly three cells away in that direction,
   assuming all three moves are legal.
6. **Given** a boulder directly above the cell to the kid's right, **When** the
   player taps right once, **Then** the kid ends one cell right and does not
   continue into the cell beyond it.

---

### User Story 2 - Held still means "keep going" (Priority: P2)

A player crossing a long corridor of dirt holds the left arrow down and the kid
keeps walking, one cell per tick, for as long as they hold it. They release; the
kid stops. They hold again; it walks again. Sustained movement is how the game
is played, and it is unchanged in cadence once it is under way.

**Why this priority**: The issue is explicit that continuous movement while a
key is held "is correct and must stay". A fix that makes taps reliable by
breaking holds is not a fix. It is P2 only because it is the behavior being
preserved rather than the behavior being added.

**Independent Test**: With no browser, hold a direction across many consecutive
per-tick reads and assert the exact pattern: a move on the first observing tick,
nothing on the second, then that direction on every read thereafter with no
gaps, for an arbitrary number of ticks.

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the player holds a direction control down
   across many ticks, **Then** the first tick reports that direction, the second
   reports nothing, and every tick from the third onward reports it,
   indefinitely, with no further dropped ticks.
2. **Given** a direction held down, **When** the player releases it, **Then** no
   further moves in that direction are reported.
3. **Given** a direction held down, **When** the player presses a second,
   different direction without releasing the first, **Then** the newly pressed
   direction takes effect on the next tick, exactly as it does today.
4. **Given** two directions held with the second one taking effect, **When** the
   player releases the second, **Then** the first resumes.
5. **Given** a direction held down for a long time, **When** the player releases
   and immediately presses again, **Then** the second press is treated as a
   fresh press, not a continuation of the first.
6. **Given** a direction held down while the grab modifier is also held,
   **Then** the grab modifier's own behavior is unchanged — it is a modifier,
   not a direction, and this feature does not touch it.

---

### User Story 3 - The same tap on every control (Priority: P3)

A player on a tablet taps the on-screen d-pad, and a player on a controller taps
the d-pad or flicks the stick. A tap means the same thing on every control the
game offers, so a player who learns the game on one device does not have to
relearn its timing on another. All three sources are in scope, and they share
one rule rather than three copies of it.

**Why this priority**: Principle V requires every input mode to be a real way to
play, and shipping the fix on one of three input paths would guarantee a
follow-up issue. It is P3 because the keyboard is the reference control scheme
and US1 delivers the reported fix on its own.

**Independent Test**: With no browser, drive each source's direction reporter
through the identical press/hold/release sequence used in US1 and US2 and assert
an identical sequence of reported directions. Additionally assert that all three
resolve their repeats through the same shared rule, not through per-source
copies of it.

**Acceptance Scenarios**:

1. **Given** the keyboard, the touch d-pad, and the gamepad, **When** an
   identical tap sequence is driven through each, **Then** each reports the
   identical number of moves.
2. **Given** the keyboard, the touch d-pad, and the gamepad, **When** an
   identical hold sequence is driven through each, **Then** each reports the
   identical per-tick cadence, including the same one-tick gap after the first
   move.
3. **Given** the three sources, **When** the repeat rule is exercised, **Then**
   each source resolves it through the one shared rule, so a change to the rule
   changes all three together and none can drift.
4. **Given** two sources reporting a direction on the same tick, **When** the
   merge runs, **Then** the existing fixed precedence decides the winner,
   unchanged — this feature adds no cross-source coupling.
5. **Given** a controller with a direction held, **When** the player also holds
   a direction on the keyboard, **Then** each source's own repeat state is
   tracked independently and neither resets the other's.

---

### Edge Cases

- **A tap shorter than one tick.** A press and release that no tick ever
  observes down still yields exactly one move. This works today and must keep
  working — it is the one case the current code deliberately handles.
- **Two full press-release cycles between consecutive ticks.** The tick that
  follows reports one move, not two. Moves are not queued: the sim takes one
  direction per tick, and a backlog would let a mash outrun the cave and land
  the kid somewhere the player never saw.
- **A press that is still down when a different direction is pressed.** The new
  direction is a fresh press and moves immediately; the older held direction
  does not.
- **A key held across a pause and resume.** Resuming does not count as a fresh
  press. The player who paused mid-corridor with a key down resumes walking,
  and does not get a bonus first step.
- **A key held when the kid dies, the cave restarts, or a screen changes.** The
  held state survives, but no move is reported while the cave is not in play,
  and the first tick of the next cave does not owe the player a queued move.
- **A key held when the page or window loses focus.** The release event may
  never arrive. The kid must not walk forever: the existing behavior on focus
  loss is preserved or improved, never made worse by this feature.
- **OS key auto-repeat.** Already excluded and must stay excluded. The cadence
  of held movement is the game's tick rate, never the operating system's repeat
  rate, and no part of this feature may reintroduce a dependency on it.
- **A tap that becomes a hold.** A press the player did not intend as a tap is
  still down when a third tick observes it, and simply starts repeating from
  there. There is no separate "tap mode"; a tap is just a press that ended early.
- **A direction tapped while a boulder push is in progress.** Push behavior is a
  sim rule and is untouched; the kid gets exactly one push attempt per reported
  move, so a tap is one attempt.
- **Rapid alternating taps (left, right, left).** Each tap is one cell in its
  own direction; nothing is coalesced across directions and nothing is dropped
  because the previous direction was still settling.

## Requirements *(mandatory)*

### Functional Requirements

**The rule**

- **FR-001**: A press and release of a direction control that no more than two
  consecutive ticks observe down — which, because the first observing tick may
  arrive immediately, means every press released within 250 ms — MUST produce
  exactly one move in that direction while the cave is in play and the move is
  legal, regardless of when the press falls relative to a tick boundary.
- **FR-002**: A direction control still held when a third tick observes it down
  MUST produce one move per tick from that tick onward, indefinitely, for as long
  as it is held. Sustained movement is a required behavior, not a side effect.
- **FR-003**: The rule that separates "pressed" from "still held" MUST be a
  **one-tick repeat delay**: a fresh press moves on the first tick that observes
  it down, the next tick reports nothing for that direction, and every tick after
  that reports it again for as long as it is held. The delay MUST be expressed as
  a count of tick intervals — one interval, 125 ms at the current 8 Hz tick rate
  — and never as a millisecond value, so the tick rate remains the single source
  of truth for cadence. The consequence, and the guarantee the rest of this spec
  leans on, is that a press released within 250 ms of going down is exactly one
  cell at every tick phase, while held movement pays a single 125 ms hitch before
  it gets going.
- **FR-004**: The rule MUST apply to all three input sources — the keyboard
  direction keys (arrows and WASD), the on-screen touch d-pad, and the gamepad
  d-pad buttons and stick past its engage threshold. A tap means the same thing
  on every device; no source is exempt. Each source keeps its own per-control
  repeat state, but there is exactly one rule, shared (FR-018).
- **FR-005**: A fresh press MUST always move on the next tick. No press ever
  waits out the delay before its *first* move; the delay governs repeats only.
- **FR-006**: Releasing and re-pressing a direction MUST reset that direction's
  repeat state, so every press gets its own first move and its own delay.
- **FR-007**: Pressing a different direction while one is already held MUST be
  treated as a fresh press of the new direction under FR-005.
- **FR-008**: At most one move MUST be reported per tick per input source.
  Presses MUST NOT be queued or buffered across ticks; a mash produces one move
  per tick at most, never a backlog that replays later.
- **FR-009**: The existing sub-tick tap guarantee MUST be preserved: a press and
  release that no tick observes down still reports exactly one move.
- **FR-010**: Held-movement cadence MUST remain driven by the game's tick rate.
  OS key auto-repeat MUST remain ignored, and no part of this feature may
  reintroduce a dependency on the OS repeat rate or delay.

**What this feature must not disturb**

- **FR-011**: No file under `src/sim/` may change. The simulation continues to
  take one direction-or-nothing per tick and to move the kid exactly one cell
  per tick per direction. No physics rule, no cell state, and no existing sim
  test's expected grid changes.
- **FR-012**: The tick rate MUST NOT change. Making taps reliable by speeding up
  the sim is out of scope and would alter every timed behavior in the game.
- **FR-013**: The grab modifier and every one-shot action — pause, restart,
  start/confirm, cycle-theme, mute — MUST be unaffected. Their existing
  "fires once per press" behavior is already correct and is not what this
  feature is about.
- **FR-014**: Cross-source direction precedence MUST be unchanged. This feature
  adds no coupling between sources: each in-scope source tracks its own repeat
  state, and no source's press or release resets another's.
- **FR-015**: No move MUST be reported while the cave is not in play, and no
  move may be owed to the player on the first tick after play resumes. A pause,
  a death, a cave restart, or a screen change is not a fresh press and does not
  grant an extra step.
- **FR-016**: The build MUST remain a single self-contained `dist/index.html`
  playable from `file://`, with no added runtime dependency.

**How it is verified**

- **FR-017**: The rule MUST be a total, pure function of the control's
  press/release state and the count of ticks since the press, with no wall-clock
  reads and no timers anywhere in the input path. `Date.now()`,
  `performance.now()`, and any other timestamp comparison against wall-clock time
  are explicitly out of bounds; the repeat state is a tick count.
- **FR-018**: The rule MUST live in the input layer as **one shared, named,
  separately testable unit** that all three sources of FR-004 call — the same
  shape as the shell's existing input-merge, touch-visibility,
  audio-availability, mute, and stall modules. It MUST NOT be reimplemented once
  per source: three copies of the rule is three places for it to drift, which is
  the shared cause of this project's recent run of defects. Per-source *state* is
  expected; per-source *rules* are forbidden.
- **FR-019**: The rule MUST be covered by tests in the existing node-only test
  environment, with no DOM, no canvas, no real timers, and no browser. The tests
  MUST pin, at minimum: the sub-tick tap (FR-009), a tap at every tick offset for
  every tap length up to two observed ticks (FR-001), the one-tick suppression
  gap followed by settled per-tick cadence over many ticks (FR-002, FR-003),
  release-and-re-press (FR-006), and direction change while held (FR-007). The
  tests MUST also assert that each of the three sources — keyboard, touch, and
  gamepad — resolves its repeats through the single shared rule of FR-018 rather
  than through its own logic. This last assertion is not deferred by the
  hardware gap noted in the maintainer checks; it ships with the feature.
- **FR-020**: The existing touch and gamepad tests that assert those sources
  report a held direction on *every* consecutive read MUST be updated to the new
  cadence, since FR-004 places both in scope. This is the rule being corrected,
  and this spec is the authority for the change. It is the only intentional
  behavioral regression this feature is permitted, and it MUST NOT extend to any
  other assertion in those suites.
- **FR-021**: Every test that passed before this feature MUST still pass, except
  the ones FR-020 names.

### Key Entities

- **Direction Control**: any control that reports one of up/down/left/right —
  a keyboard direction key, an on-screen d-pad zone, a gamepad d-pad button, or
  a gamepad stick past its engage threshold. All four are in scope (FR-004).
- **Press State**: per-source, per-control state distinguishing "pressed this
  tick" from "still held since an earlier tick", plus the count of ticks since
  the press. It is a tick count, never a timestamp (FR-017).
- **Repeat Delay**: one tick interval. A press moves on the first tick that
  observes it, is suppressed on the second, and repeats every tick from the
  third onward. It is a count of tick intervals, not a duration in
  milliseconds — 125 ms is what one interval happens to be at the current tick
  rate, not the value being stored.
- **Reported Move**: the at-most-one direction a source hands to the tick about
  to run. Unchanged in shape — this feature changes only how often a single
  press produces one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tap is one cell 100% of the time. Across a sweep of every tick
  offset and every tap length from zero up to two observed ticks, the number of
  reported moves is exactly one in every case — enforced by a test, not by feel.
- **SC-002**: A tap of 150 ms — the slow end of a comfortable human tap — moves
  exactly one cell, where today it usually moves two. The guaranteed window is
  250 ms, a comfortable margin over the 80–150 ms tap the issue describes,
  because being one cell off under a boulder is fatal and a marginal fix is not
  a fix.
- **SC-003**: Held movement reaches a steady one cell per tick and stays there:
  over 100 consecutive ticks with the control held, exactly 99 moves are
  reported — one suppressed tick, and no gaps after it.
- **SC-004**: The delay before held movement reaches full speed is exactly one
  tick interval (125 ms at the current tick rate) on every attempt, never more
  and never phase-dependent.
- **SC-005**: The maintainer can place the kid on any chosen cell of a cave on
  the first attempt, using taps alone, on the keyboard and on the touch d-pad.
  The same check on a gamepad is deferred until hardware is on hand (see the
  maintainer checks below); the requirement itself is not deferred.
- **SC-006**: Zero changes under `src/sim/`, and every sim test passes unchanged
  — verified by the file list at review, not by assertion.
- **SC-007**: Every test that passed before this feature still passes, except
  those FR-020 names, and `dist/` still holds exactly one self-contained
  `index.html`.
- **SC-008**: Frame rate is unchanged: the rule adds no per-tick allocation and
  no per-frame work beyond a counter, so the constitution's bounds (target
  60 fps, floor 30 fps) are met exactly as before.

## What the maintainer checks by hand

CI has no browser, no touchscreen, and no gamepad, so feel is verified at review
time. With the game running from `dist/index.html` opened via `file://`:

1. **The reported bug** — tap an arrow key, and tap a WASD key, twenty times
   each at a natural pace. The kid moves exactly one cell every time, on both
   key sets.
2. **Fine positioning** — line the kid up directly under the edge of a boulder
   overhang, one cell at a time. It is possible on the first attempt, without
   overshooting and having to come back.
3. **The hitch** — hold a direction and cross a long dirt corridor. Judge
   whether the single 125 ms pause before the walk gets going is acceptable.
   This is the cost the clarification bought, and it is the thing to feel for;
   if it is worse than it reads on paper, that is a new issue, not a silent
   retune.
4. **Direction changes while held** — hold left, then press right without
   releasing left. The kid turns immediately, with no extra pause.
5. **Mash** — alternate left and right rapidly. The kid tracks the taps and
   never runs on after the keys stop.
6. **Touch** — on a real tablet, tap the on-screen d-pad and then hold it. One
   tap is one cell and a hold walks after a single tick's pause, exactly as on
   the keyboard, and the pad still re-acquires as a thumb slides between zones.
7. **Gamepad — DEFERRED, waiting on hardware.** On a real controller, tap the
   d-pad and flick the stick, then hold each; the behavior should match the
   keyboard. No controller is on hand for this feature, so this item ships
   stated and unchecked rather than dropped or marked done. The node-level
   assertion that the gamepad source resolves repeats through the shared rule
   (FR-019) is *not* deferred and must pass before merge.
8. **Focus loss** — hold a direction and click away from the page, or switch
   apps. The kid stops; it does not walk off on its own.
9. **Pause and resume with a key down** — pause mid-corridor with a direction
   held, resume, and confirm the walk continues without a stutter or a free
   extra step.

## Assumptions

- **The sim is correct and untouched.** The issue establishes this and the spec
  adopts it: the fix is entirely in how many ticks one press speaks for.
- **The tick rate stays at 8 Hz.** Raising it would shrink the problem but would
  change every timed behavior in the game — cave clocks, magic wall duration,
  amoeba growth, enemy patrol cadence — and is a different spec.
- **No moves are queued.** A press-release pair that lands between ticks yields
  one move on the next tick, and a second pair in the same gap does not add a
  second. Queuing would let a mash outrun the cave and put the kid somewhere the
  player never saw.
- **A pause, death, restart, or screen change is not a fresh press.** Held state
  survives them; no move is owed on resume.
- **The grab modifier is out of scope.** It is a held modifier read alongside a
  direction, not a direction, and its behavior is already right.
- **One-shot actions are out of scope.** Pause, restart, start/confirm,
  cycle-theme, and mute already fire exactly once per press on every source, and
  this feature does not revisit them.
- **Per-control state, not per-source-global.** Each direction tracks its own
  repeat state so that changing direction mid-hold responds immediately, which
  is the behavior players already have and expect.
- **The delay is one number, not a per-source tuning table.** All three sources
  share the one-tick delay; a per-device value would be a later spec, and there
  is no evidence yet that a thumb and a finger want different numbers.
- **Focus-loss handling is preserved, not redesigned.** If holding a key through
  a focus loss is imperfect today, this feature must not make it worse, but
  fixing it is not in scope.
- **Nothing persists.** The delay is a constant in the shipped build, not a
  player-facing setting and not something stored locally. A configurable
  sensitivity control would be a later spec.
