# Phase 0 Research: One Tap, One Cell

Both questions the spec flagged as needing a maintainer decision (the delay
length, and which input sources are in scope) were already answered on
issue #30 and are recorded in `spec.md`'s Clarifications section — there is
no `[NEEDS CLARIFICATION]` marker left in the spec. This document instead
resolves the smaller, implementation-shaped questions the spec leaves open
by design (it states behavior and test obligations, not a code shape), so
that Phase 1 can proceed without inventing decisions mid-design.

## D1: Where does the shared rule live, and what does it export?

**Decision**: A new file, `src/lib/input/repeat.ts`, exporting:

- `REPEAT_DELAY_TICKS = 1` — a named constant, in tick intervals (FR-003).
- `RepeatState` — a plain readonly-object type, `{ readonly ticksSincePress: number }`.
- `INITIAL_REPEAT_STATE` — the state of a control that is not held.
- `advanceRepeat(state: RepeatState, isHeldThisTick: boolean): { state: RepeatState; report: boolean }`
  — a total, pure reducer: given the prior state and whether the control is
  observed down this tick, returns the next state and whether this tick
  should report the direction.

**Rationale**: This is the same shape as every other module FR-018 names as
precedent (`merge.ts`'s `resolveDirection`/`orAll`, `visibility.ts`'s
`nextLastInputSource`/`shouldShowTouchControls`, `audio/mute.ts`'s
`resolveStoredMute`/`toggleMute`): a plain exported pure function over
plain values, no class, no DOM, no Svelte import, one file, one job. Making
it a *reducer* (old state + one boolean in, new state + one boolean out)
rather than a class with internal mutable state keeps it a "total function
of the control's press/release state and the count of ticks since the
press" per FR-017 — trivially testable with a literal table, and reusable
by all three sources without any of them subclassing or configuring it.

**Alternatives considered**:
- *A class (`RepeatGate`) owning its own mutable counter.* Rejected: every
  existing shared-rule module in this codebase is a stateless pure
  function; introducing the one stateful class among them would be the
  kind of drift FR-018 exists to prevent, and it would blur "per-source
  state, one shared rule" into "shared state," which the spec's Assumptions
  explicitly reject ("per-control state, not per-source-global").
- *A hook/callback-based timer.* Rejected outright: FR-017 forbids any
  timer or wall-clock read in the input path. The rule must be driven
  exclusively by tick-synchronous calls from each source.
- *Folding the rule into `merge.ts`.* Rejected: `merge.ts` resolves
  cross-source precedence *after* each source has already decided its own
  direction; the repeat delay operates *before* that, per control, per
  source, and conflating them would make `merge.ts` respond to per-source
  hold duration, which FR-014 explicitly forbids ("this feature adds no
  coupling between sources").

## D2: How does `ticksSincePress` advance for a direction that is held but not the one currently reported?

**Decision**: `advanceRepeat` is called once per tick for *every* control a
source is currently tracking as held — not only the one whose direction is
about to be reported. Each source keeps a small state store (keyboard: a
`Map<Direction, RepeatState>`, one entry per direction currently in its
`held` stack; touch/gamepad: a single `RepeatState` plus the last resolved
`Direction`, since at most one direction can be live at a time on those
sources). The direction actually returned by `consumeDirection()`/`poll()`
is whichever direction precedence already picks today (keyboard: most
recently pressed still-held; touch: the live pad assignment; gamepad: the
merged d-pad/stick value) — repeat delay only gates whether that pick is
reported this tick or suppressed.

**Rationale**: US2's acceptance scenario 4 ("Given two directions held with
the second one taking effect, When the player releases the second, Then
the first resumes") requires the first direction's progress toward "settled
cadence" to survive being preempted — the Key Entities section defines
`Press State` as "the count of ticks since the press," not "the count of
ticks this direction was actually reported," so a preempted-then-resumed
direction should not be forced to pay the one-tick hitch a second time.
Advancing every held control's state every tick (cheap: at most a handful
of directions can ever be simultaneously "held" on one source) makes this
fall out of the reducer with no special-case code for "resuming."

**Alternatives considered**:
- *Only advance the top-of-stack direction's state; freeze the others.*
  Rejected: this would replay the one-tick hitch every time a direction
  resumes after a preemption, which is a plausible but stricter reading of
  US2 AC4 than "the first resumes" supports, and adds a special case
  ("was this direction just promoted back to top-of-stack?") that the
  simpler always-advance rule avoids entirely.

## D3: How do touch and gamepad — which have no discrete per-direction press/release events — detect a "fresh press" for FR-006/FR-007?

**Decision**: Both sources compare this tick's resolved direction (the pad
hit-test result, or the merged d-pad/stick value) against the direction
resolved on the previous tick. A different value (including the transition
into or out of `undefined`) resets `RepeatState` to `INITIAL_REPEAT_STATE`
before calling `advanceRepeat`, exactly as a keyboard keyup/keydown pair
does. This covers a thumb sliding from one pad zone to another (already a
supported "re-acquire" gesture per the touch contract) and a gamepad stick
moving from one engaged direction straight to another, without either
source needing a synthetic "release" event.

**Rationale**: The spec's edge cases treat "a press that is still down when
a different direction is pressed" as a fresh press regardless of source
(FR-007 is stated once, for "the rule," not once per source). Comparing
consecutive resolved values is the natural equivalent of a keyup/keydown
pair for sources that only ever expose "what is the current value," and it
requires no new state beyond the one `Direction | undefined` each source
already computes internally.

**Alternatives considered**:
- *Leave touch/gamepad without direction-change detection, relying only on
  the undefined↔defined transition.* Rejected: a thumb sliding directly
  from the up-zone to the right-zone, or a stick swept from up to right,
  would otherwise be misread as one continuous "held" span and skip the
  fresh-press's guaranteed first-tick move, which is a strictly worse
  outcome than what FR-007 asks for and would make touch/gamepad behave
  differently from keyboard for the identical gesture — a violation of
  US3's "a tap means the same thing on every control."

## D4: Do the sub-tick tap path (keyboard's `pendingTap`) and the new repeat logic interact?

**Decision**: No. `pendingTap` continues to fire exactly once, independent
of `RepeatState`, for the case FR-009 protects: a press and release that no
tick's `consumeDirection()` call ever observes as "held." The repeat delay
only applies to directions that `consumeDirection()` observes as held at
call time. Because a `pendingTap`-only press is by construction never seen
as held, its `RepeatState` entry is never created, so there is nothing for
the delay to gate.

**Rationale**: FR-009 requires this exact case to keep working unchanged,
and it already does today via a mechanism unrelated to holding. Touching it
would risk the one behavior the spec calls out as "the one case the current
code deliberately handles" (Edge Cases). Leaving the two mechanisms
disjoint is also simpler than unifying them, and the spec does not ask for
unification — only that both guarantees (one move for a sub-tick tap, one
move for a tap observed on up to two ticks) hold simultaneously.

**Alternatives considered**:
- *Route every press, including sub-tick taps, through `RepeatState`.*
  Rejected: a sub-tick tap is never observed as held, so it never gets a
  chance to call `advanceRepeat` at all under the existing call structure;
  forcing it through the same path would require inventing a synthetic
  "observed for zero ticks" call that has no equivalent in touch or
  gamepad and adds complexity with no behavioral benefit.

## D5: Naming and placement of the updated FR-020 tests

**Decision**: The two existing assertions that currently read "every
`consumeDirection()`/`poll()` call while held returns the direction" (in
`tests/lib/input/touch/TouchInput.test.ts` and
`tests/lib/input/gamepad/GamepadInput.test.ts`) are edited in place to
assert the new cadence (tick 1 reports, tick 2 does not, tick 3+ reports),
keeping their existing `describe`/`it` structure and cross-references to
`SC-003` so the history of *why* the assertion exists is not lost. New
tap-length-sweep and direction-change assertions are added as new `it`
blocks in the same files, matching `keyboard.test.ts`'s existing style
(literal press/release sequences, not fake timers).

**Rationale**: FR-020 is explicit that this is "the only intentional
behavioral regression this feature is permitted" and must not extend to any
other assertion in those suites — editing the named assertions in place
(rather than deleting and replacing the files) makes the diff minimal and
reviewable against exactly that constraint.
