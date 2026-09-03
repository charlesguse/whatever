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
per-tick reads. For every tap that spans up to the stated hold threshold —
including a tap that spans zero tick boundaries, one tick boundary, and the
threshold number of boundaries — assert the sequence of reported directions
contains exactly one move. Sweep the tap across every tick phase; the count
never changes.

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the player presses and releases a
   direction control entirely between two ticks (no tick observes it down),
   **Then** exactly one move in that direction is reported — the existing
   guarantee, unchanged.
2. **Given** a cave in play, **When** the player presses a direction control and
   releases it after one tick has observed it down, **Then** exactly one move is
   reported.
3. **Given** a cave in play, **When** a tap is repeated at every possible offset
   relative to the tick boundary, **Then** every repetition reports the same
   number of moves — the reported count does not depend on tick phase.
4. **Given** a cave in play, **When** the player taps a direction three times in
   a row, **Then** the kid ends up exactly three cells away in that direction,
   assuming all three moves are legal.
5. **Given** a boulder directly above the cell to the kid's right, **When** the
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
per-tick reads and assert that after the stated settling period every read
reports that direction, with no gaps, for an arbitrary number of ticks.

**Acceptance Scenarios**:

1. **Given** a cave in play, **When** the player holds a direction control down
   across many ticks, **Then** after the stated settling period every tick
   reports that direction, indefinitely, with no dropped ticks.
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
the d-pad or flicks the stick. Whatever this spec decides a tap means, it means
the same thing on every control the game offers, so a player who learns the
game on one device does not have to relearn its timing on another — or, if the
maintainer decides otherwise, the difference is a stated, tested decision rather
than an accident of which module was edited.

**Why this priority**: Principle V requires every input mode to be a real way to
play, and the issue explicitly asks for the scope to be stated. It is P3 because
the keyboard is the reference control scheme and US1 delivers the reported fix
on its own.

**Independent Test**: With no browser, drive each in-scope source's direction
reporter through the identical press/hold/release sequence used in US1 and US2
and assert an identical sequence of reported directions. For any source the
clarification places out of scope, assert its existing every-tick behavior is
unchanged.

**Acceptance Scenarios**:

1. **Given** the input sources the resolved scope covers, **When** an identical
   tap sequence is driven through each, **Then** each reports the identical
   number of moves.
2. **Given** the input sources the resolved scope covers, **When** an identical
   hold sequence is driven through each, **Then** each reports the identical
   per-tick cadence after settling.
3. **Given** any input source the resolved scope excludes, **When** the same
   sequences are driven through it, **Then** its behavior is byte-identical to
   today's.
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
- **A tap that becomes a hold.** A press the player did not intend as a tap
  simply crosses the threshold and starts repeating. There is no separate
  "tap mode"; a tap is just a press that ended early.
- **A direction tapped while a boulder push is in progress.** Push behavior is a
  sim rule and is untouched; the kid gets exactly one push attempt per reported
  move, so a tap is one attempt.
- **Rapid alternating taps (left, right, left).** Each tap is one cell in its
  own direction; nothing is coalesced across directions and nothing is dropped
  because the previous direction was still settling.

## Requirements *(mandatory)*

### Functional Requirements

**The rule**

- **FR-001**: A press and release of a direction control, of any duration up to
  and including the stated hold threshold, MUST produce exactly one move in that
  direction while the cave is in play and the move is legal — regardless of when
  the press falls relative to a tick boundary.
- **FR-002**: A direction control held beyond the hold threshold MUST continue to
  produce one move per tick, indefinitely, for as long as it is held. Sustained
  movement is a required behavior, not a side effect.
- **FR-003**: The rule that separates "pressed" from "still held"
  MUST be [NEEDS CLARIFICATION: the issue asks the spec to settle this rather
  than pick silently. Should a fresh press move immediately and then wait a
  repeat delay before the held direction starts repeating — and if so, how long?
  Option A: a one-tick delay (125 ms), which makes every tap up to 250 ms
  exactly one cell and costs one 125 ms hitch at the start of held movement.
  Option B: a two-tick delay (250 ms), which makes every tap up to 375 ms
  exactly one cell and costs a 250 ms hitch. Option C: no delay — keep today's
  behavior and accept that fine positioning stays difficult].
- **FR-004**: The chosen rule MUST apply to
  [NEEDS CLARIFICATION: which input sources? Touch and gamepad hold the same
  "held direction repeats every tick" shape as the keyboard. Option A: all three
  (keyboard, touch d-pad, gamepad d-pad and stick), so a tap means the same
  thing on every device. Option B: keyboard only, leaving touch and gamepad
  exactly as they are today].
- **FR-005**: A fresh press MUST always move on the next tick. No press ever
  waits for a delay before its *first* move; the delay, if any, governs only
  repeats.
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

- **FR-017**: The rule MUST be expressible as a pure function of the control's
  press/release history and the count of ticks observed, with no wall-clock
  reads and no timers anywhere in the input path. A timestamp comparison against
  wall-clock time is explicitly out of bounds.
- **FR-018**: The rule MUST live in the input layer, in the same shape as the
  shell's existing input-merge, touch-visibility, audio-availability, mute, and
  stall modules — a small, separately testable unit, not logic scattered through
  the tick loop or a component.
- **FR-019**: The rule MUST be covered by tests in the existing node-only test
  environment, with no DOM, no canvas, no real timers, and no browser. The tests
  MUST pin, at minimum: the sub-tick tap (FR-009), a tap at every tick offset up
  to the hold threshold (FR-001), settled hold cadence over many ticks (FR-002),
  release-and-re-press (FR-006), and direction change while held (FR-007).
- **FR-020**: If the resolved scope of FR-004 covers touch or gamepad, the
  existing tests that assert those sources report a held direction on *every*
  consecutive read MUST be updated to the new cadence, and the spec's resolution
  of FR-004 is the authority for that change. This is the only intentional
  behavioral regression this feature is permitted, and it MUST NOT extend to any
  other assertion in those suites.
- **FR-021**: Every test that passed before this feature MUST still pass, except
  the ones FR-020 names.

### Key Entities

- **Direction Control**: any control that reports one of up/down/left/right —
  a keyboard direction key, an on-screen d-pad zone, a gamepad d-pad button, or
  a gamepad stick past its engage threshold. Which of these the rule covers is
  FR-004's open question.
- **Press State**: per-source, per-control state distinguishing "pressed this
  tick" from "still held since an earlier tick", plus the count of ticks since
  the press. It is a tick count, never a timestamp (FR-017).
- **Hold Threshold**: the number of ticks a press must persist before it begins
  repeating. Its value is FR-003's open question; that it is a tick count is
  not.
- **Reported Move**: the at-most-one direction a source hands to the tick about
  to run. Unchanged in shape — this feature changes only how often a single
  press produces one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tap is one cell 100% of the time. Across a sweep of every tick
  offset and every tap duration from zero up to the hold threshold, the number
  of reported moves is exactly one in every case — enforced by a test, not by
  feel.
- **SC-002**: A tap of 150 ms — the slow end of a comfortable human tap — moves
  exactly one cell, where today it usually moves two.
- **SC-003**: Held movement reaches a steady one cell per tick and stays there:
  over 100 consecutive ticks with the control held, exactly 100 moves minus the
  settling period are reported, with no gaps after settling.
- **SC-004**: The delay before held movement reaches full speed is at most the
  hold threshold resolved in FR-003, and is the same on every attempt.
- **SC-005**: The maintainer can place the kid on any chosen cell of a cave on
  the first attempt, using taps alone, on the keyboard and on every input source
  FR-004's resolution covers.
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
   whether the pause before the walk gets going is acceptable, or whether the
   threshold should come down. This is the cost the clarification bought, and it
   is the thing to feel for.
4. **Direction changes while held** — hold left, then press right without
   releasing left. The kid turns immediately, with no extra pause.
5. **Mash** — alternate left and right rapidly. The kid tracks the taps and
   never runs on after the keys stop.
6. **Touch** — on a real tablet, tap the on-screen d-pad and then hold it. The
   behavior matches whatever FR-004 resolved to, and the pad still re-acquires
   as a thumb slides between zones.
7. **Gamepad** — on a real controller, tap the d-pad and flick the stick, then
   hold each. The behavior matches whatever FR-004 resolved to.
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
- **The threshold is one number, not a per-source tuning table.** If FR-004
  resolves to "all sources", they share the same threshold; a per-device value
  would be a later spec, and there is no evidence yet that a thumb and a finger
  want different numbers.
- **Focus-loss handling is preserved, not redesigned.** If holding a key through
  a focus loss is imperfect today, this feature must not make it worse, but
  fixing it is not in scope.
- **Nothing persists.** The threshold is a constant in the shipped build, not a
  player-facing setting and not something stored locally. A configurable
  sensitivity control would be a later spec.
