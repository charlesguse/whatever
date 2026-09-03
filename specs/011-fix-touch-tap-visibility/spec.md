# Feature Specification: Taps Never Hide The Touch Controls

**Feature Branch**: `011-fix-touch-tap-visibility`

**Created**: 2026-09-03

**Status**: Draft

**Input**: Lifecycle issue #31 — "Touch controls disappear when tapping them on a
keyboard-less device". Reported by the maintainer during the 007 manual pass on
a phone/tablet with no keyboard attached: tapping inside the movement control
circle, as if it were a D-pad, makes the touch controls disappear; any single
tap may make them appear or disappear. On a device with no keyboard this must
never happen — the touch controls are the only way to play.

## Context

Feature 007 established the adaptive visibility rule (FR-027a): on a
touch-capable platform the controls start visible, hide on a discrete input (a
key press or a click), and come back on any touch. Pointer *movement* never
changes anything.

That rule is correct. What is broken is the meaning of one of its inputs. Every
tap on a touch screen is followed by a browser-synthesized click, and the game
counts that synthesized click as "the player used a mouse". A tap therefore
first shows the controls (on the touch) and then hides them (on the synthesized
click that follows) — every tap flips the state. Taps that land on something
which suppresses the synthesized click leave the controls up, which is why the
maintainer saw the behavior as intermittent rather than consistent.

The visibility decision is already a pure, tested function, and its tests pass.
The defect is that the function is not given enough information to tell a real
mouse click from a tap-synthesized one, so the rule the game actually wants
cannot be expressed inside it, and no test over it can fail. This is the same
shape as the SC-009 gap found on feature 008: a guarantee resting on a
convention at a call site instead of on something the type system and the suite
can hold up. This feature closes it structurally — where the input came from
becomes an input to the decision, verified in the node test environment — not
with a timing window, a debounce, or a "was there a touch recently" heuristic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A player with no keyboard can keep playing (Priority: P1)

A player on a phone or tablet with no keyboard and no mouse opens the game and
plays a cave entirely by tapping and holding the on-screen controls. The
controls stay on screen for the whole session, no matter how many times, how
fast, or where the player taps.

**Why this priority**: On this device the touch controls are the only way to
play. When they vanish the game is unplayable and the player has no way to
recover except reloading. This is the whole of the reported defect and the only
part that makes the game broken rather than untidy.

**Independent Test**: On a real touch-only device, tap the pad, the grab button,
the pause button, the restart button, the theme picker, and the mute button in
turn, repeatedly, and confirm the controls never disappear at any point. Note
that emulated touch in desktop devtools does not reproduce the original defect
faithfully — the synthesized-click behavior differs — so this must be checked on
real hardware.

**Acceptance Scenarios**:

1. **Given** a touch-capable platform showing the touch controls, **When** the
   player taps a movement zone on the pad, **Then** the controls remain visible
   and the tap moves the kid — including after the browser delivers the click it
   synthesizes from that tap.
2. **Given** a touch-capable platform showing the touch controls, **When** the
   player taps any interactive element of the shell (grab, pause, restart, theme
   picker, mute), **Then** the controls remain visible.
3. **Given** a touch-capable platform showing the touch controls, **When** the
   player taps twenty times in a row anywhere on the page, **Then** the controls
   are visible after every single tap, with no flicker between taps.
4. **Given** a touch-capable platform where the controls are hidden because the
   player used a keyboard, **When** the player taps anywhere, **Then** the
   controls reappear at once and stay up for every subsequent tap.

---

### User Story 2 - A touchscreen-laptop player keeps the adaptive rule (Priority: P2)

A player on a laptop that has both a touchscreen and a keyboard drives the game
from the keyboard and trackpad. The on-screen thumb controls get out of the way
as soon as a real key or a real mouse click is used, exactly as feature 007
specified, and come back the moment the screen is touched.

**Why this priority**: This is the behavior FR-027a exists for. The fix for
User Story 1 must not be a blanket "touch capability means always visible",
which would regress it. It is second because getting it wrong leaves permanent
thumb controls on a laptop — untidy, not unplayable.

**Independent Test**: On a touchscreen laptop, alternate keyboard, mouse, and
touch through a cave and confirm each transition still happens instantly and in
the right direction.

**Acceptance Scenarios**:

1. **Given** a touchscreen laptop showing the touch controls, **When** the
   player presses a movement key, **Then** the controls disappear at once.
2. **Given** a touchscreen laptop showing the touch controls, **When** the
   player clicks with a real mouse or trackpad, **Then** the controls disappear
   at once.
3. **Given** a touchscreen laptop with the controls hidden, **When** the player
   touches the screen, **Then** the controls reappear at once.
4. **Given** a touchscreen laptop in either visibility state, **When** the
   player moves the mouse or trackpad pointer without clicking, **Then** nothing
   appears, disappears, or flickers.

---

### User Story 3 - The rule is pinned where CI can see it (Priority: P3)

The maintainer can read the visibility rule as a single table — where the input
came from, what the platform reports, what the player last used — and see that
table asserted by the browser-less suite, so this class of defect fails a test
next time instead of reaching a manual pass.

**Why this priority**: It is what stops the regression from recurring, but the
player-facing fix is what makes the game playable. It is a distinct slice
because the table can be written and asserted before any call site changes.

**Independent Test**: Run the suite in the node environment and confirm it
covers a tap-synthesized activation and a genuine mouse activation as separate
rows with opposite outcomes, and that reverting the fix makes it fail.

**Acceptance Scenarios**:

1. **Given** the browser-less suite, **When** it runs, **Then** it asserts an
   activation whose origin is a touch leaves the controls visible and an
   activation whose origin is a mouse hides them, with an unknown origin and a
   pen origin both landing on the visible side.
2. **Given** the visibility decision, **When** a reviewer reads it, **Then** the
   origin of an activation is one of its declared inputs rather than something a
   caller is trusted to have classified correctly.
3. **Given** the existing feature 007 visibility tests, **When** the suite runs,
   **Then** they still pass unchanged in meaning: capability gates everything,
   keyboard hides, touch shows, pointer movement is not an input at all.

---

### Edge Cases

- **A tap whose synthesized click is suppressed** (the element cancelled the
  default action) versus one whose click is delivered: both leave the controls
  visible. The outcome must not depend on which element was tapped — that
  dependence is exactly what made the reported defect look intermittent.
- **An activation with no discernible origin** — a browser that reports nothing
  about what produced the click: touch-safe, the controls stay visible (FR-004).
- **A click produced by pressing Enter or Space on a focused button**: the
  controls hide, but because of the key press that precedes the activation, not
  because of the activation itself (FR-004a). Unknown-origin-means-visible
  therefore costs nothing on the keyboard path.
- **A stylus or pen** on a tablet: touch-like, the controls stay visible
  (FR-005).
- **A hybrid device that has touch and a keyboard**: tapping must still never
  hide the controls there either. The rule keys on where the input came from,
  never on whether a keyboard is attached — the game cannot reliably detect
  that, and FR-029 forbids inferring it from device characteristics.
- **A long-press or a drag that ends outside where it started**: no click is
  synthesized in some browsers and one is in others; either way the controls
  stay visible.
- **A touch on a platform reporting no touch capability** (an inaccurate or
  spoofed capability report): capability still gates everything, so nothing
  appears. This feature does not widen when controls may exist.
- **Rapid alternation** — tap, key, tap, click, tap — with no delay between
  them: each transition resolves from the input that just happened, with no
  window during which an earlier input still counts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a touch-capable platform, no touch interaction — a tap, a hold,
  a drag, or anything the browser synthesizes as a consequence of one — may hide
  the touch controls. This holds for touches on the movement pad, the grab
  button, the pause and restart buttons, the theme picker, the mute button, and
  any other part of the page.
- **FR-002**: A genuine key press and a genuine mouse or trackpad click MUST
  still hide the touch controls instantly, and any touch MUST still bring them
  back instantly, exactly as FR-027a of feature 007 requires. Neither transition
  gains a delay, debounce, or fade.
- **FR-003**: Pointer *movement* MUST remain incapable of showing or hiding the
  controls (007 FR-027a). This feature MUST NOT add movement as an input to the
  decision.
- **FR-004**: An activation whose origin cannot be determined MUST resolve as
  touch-safe — it MUST NOT hide the touch controls. Ambiguity is not symmetric
  here: resolving it toward "hide" would reintroduce the reported defect on
  exactly the browsers that cannot be enumerated in advance, stranding a
  touch-only player, whereas resolving it toward "show" costs at worst an untidy
  extra pad on a hybrid device.
- **FR-004a**: A click produced by pressing Enter or Space on a focused button
  MUST still hide the controls, and MUST do so by way of the key press that
  precedes it — the key press is itself a discrete input under FR-002 and marks
  the last input source before the resulting activation arrives. No rule may
  depend on the activation itself reporting a keyboard origin.
- **FR-005**: An activation produced by a pen or stylus MUST resolve as
  touch-like — it MUST NOT hide the touch controls. A pen is direct manipulation
  of the same screen the on-screen pad lives on and can operate that pad, so a
  pen user on a keyboard-less tablet losing the controls is the reported defect
  in another form.
- **FR-006**: The origin of an input MUST be an explicit input to the visibility
  decision, not a convention observed by whoever calls it. It MUST be possible
  to ask for the outcome of a tap-synthesized activation and of a genuine mouse
  activation as two separate calls with different arguments and get opposite
  answers.
- **FR-007**: The visibility decision MUST remain a pure function of reported
  capabilities and the player's last input — now including that input's origin —
  with no reads of live device state, no wall-clock time, and no timers (007
  FR-030). Specifically, the rule MUST NOT be implemented as "ignore a click
  that arrives within N milliseconds of a touch" or any other timing heuristic.
- **FR-008**: Feature detection MUST NOT sniff user agents, device names, or
  screen sizes, and MUST NOT try to detect whether a keyboard is attached (007
  FR-029). Only reported capabilities and the origin of the player's own last
  input decide.
- **FR-009**: Touch capability MUST remain the first gate: on a platform
  reporting no touch capability the controls stay absent in the sense 007's
  FR-027 means — not present-and-hidden, not disabled.
- **FR-010**: The browser-less suite MUST assert the full decision table —
  capability × last-input origin — including a row for a tap-synthesized
  activation and a row for a genuine mouse activation with opposite outcomes,
  and rows for an unknown-origin activation and a pen activation, both leaving
  the controls visible (FR-004, FR-005). The existing 007 visibility assertions
  MUST continue to pass.
- **FR-011**: The change MUST touch no file under `src/sim/`, change no keyboard
  binding, and change no touch control layout, hit area, or action mapping. It
  changes only which inputs the visibility decision receives and what it
  concludes.
- **FR-012**: The manual verification checklist MUST gain an item for the
  touch-only case: tap repeatedly on a real device with no keyboard — on the
  pad, grab, pause, restart, theme picker, and mute — and confirm the controls
  stay up. The item MUST record that emulated touch in desktop devtools does not
  reproduce this defect faithfully and that a real touch-only device is
  required. The item MUST be added to `docs/manual-verification.md` as a
  **standing** check — one re-run against every touch-affecting change, not a
  one-time pass tied to this feature.
- **FR-012a**: `docs/manual-verification.md` MUST gain a clearly separated
  "Standing checks" section, kept apart from the dated per-spec pass log. The
  log remains a record of what was verified and when; standing checks are a
  separate, re-runnable list. One file, two clearly labelled roles — not one
  list doing both jobs.
- **FR-012b**: The corresponding item in this feature's Maintainer Review Notes
  stays where it is. A spec is the record of what that feature required, so the
  standing-checks entry is an addition, not a move. Feature 007's spec MUST NOT
  be edited — earlier specs stay immutable as a record of what was specified
  when.

### Key Entities

- **Input origin**: what actually produced an input — a touch, a mouse, a
  keyboard, a pen, or an unknown source. Distinct from the kind of event
  delivered, because one touch can produce several events of different kinds.
- **Last input source**: the classification the game keeps of what the player
  most recently used, derived from the origin rather than from the event kind
  alone.
- **Platform capabilities**: what the platform reports it can do — for this
  feature, whether it has touch. Unchanged from feature 007.
- **Visibility decision**: the pure function from capabilities and last input
  source to whether the touch controls exist on screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a real touch-only device, 20 consecutive taps distributed
  across the pad, grab, pause, restart, theme picker, and mute leave the touch
  controls visible 100% of the time — zero disappearances, zero flickers.
- **SC-002**: A full cave can be played from title screen to cave completion on
  a touch-only device without the controls ever vanishing and without reloading
  the page.
- **SC-003**: On a touchscreen laptop, a real key press and a real mouse click
  each hide the controls on the first attempt, and the next touch restores them
  on the first attempt — 10 out of 10 alternations.
- **SC-004**: The browser-less suite fails if the fix is reverted — that is,
  there is at least one assertion that a tap-synthesized activation does not
  hide the controls, and it depends on the origin argument rather than on how a
  caller happens to be written.
- **SC-005**: The visibility decision's inputs are enumerable from its signature
  alone, and none of them is a clock, a timestamp, or live device state.
- **SC-006**: `npm test` passes, `dist/` still holds exactly one self-contained
  `index.html`, and no test added or changed by earlier features regresses.
- **SC-007**: `docs/manual-verification.md` carries the touch-only regression
  check in a "Standing checks" section that a reader can tell apart from the
  dated pass log at a glance, and no file under `specs/007-*` is modified.

## Assumptions

- The reported behavior is caused by the browser-synthesized click that follows
  a tap, as diagnosed in the issue. The fix is specified against that cause;
  if the manual re-check on a real device shows taps still hiding the controls
  for some other reason, that is a new finding, not a scope change here.
- Feature 007's adaptive rule (FR-027a) stays as specified. This feature
  corrects what counts as a "click" for that rule; it does not revisit whether
  hiding on discrete input is the right behavior.
- The platform exposes enough information to distinguish a touch-originated
  activation from a mouse-originated one without inspecting timing. Where it
  does not, FR-004 governs.
- The maintainer has access to a real touch-only phone or tablet for
  verification; CI cannot check any of the player-facing criteria here.
- No new runtime dependency is needed (Principle IV).

## Out of Scope

- Changing the touch control layout, sizing, hit areas, or action mapping.
- Changing gamepad behavior or gamepad-related visibility.
- Any browser-automation or headless-device test infrastructure (Principle VII
  forbids it).
- Detecting whether a physical keyboard is attached, or offering the player a
  manual show/hide toggle for the touch controls. Both were considered and
  rejected: the first is not reliably detectable and FR-029 forbids inferring it,
  the second is a feature of its own.

## Maintainer Review Notes

CI has no browser and no touchscreen, so these are the checks to make by hand at
review time, per Principle VII:

**On a real phone or tablet with no keyboard and no mouse attached** — emulated
touch in desktop devtools does **not** reproduce this defect faithfully, so this
must be a real device:

- Tap each movement zone of the pad in turn, as if it were a D-pad, at least
  five taps each. Confirm the controls never disappear and the kid moves.
- Tap grab, pause, restart, the theme picker, and the mute button. Confirm the
  controls are still there after each, and the control itself did what it should.
- Tap rapidly, twenty or so taps, all over the page including empty areas.
  Confirm no flicker at any point.
- Play a cave to completion with thumbs only. Confirm the controls never vanish
  and the page is never reloaded to recover them.
- If a stylus is available for the device, repeat the pad and button taps with
  it. Confirm the controls stay up there too (FR-005).

**On a touchscreen laptop (touch and a keyboard):**

- Confirm the controls are visible before any input, vanish on a key press,
  vanish on a real mouse click, and come back on a touch — each instantly.
- Tab to an on-screen button and activate it with Enter or Space. Confirm the
  controls hide, on the strength of the key press (FR-004a).
- Move the mouse and trackpad around, in both visibility states, without
  clicking. Confirm nothing appears, disappears, or flickers.
- Alternate touch, keyboard, and mouse through a whole cave and confirm no input
  is eaten and no stale control is left on screen.

**On a plain desktop with neither:**

- Confirm no on-screen control ever appears and there is no console error.
- Read the diff and confirm it touches no file under `src/sim/`, changes no
  keyboard binding, and changes no touch layout or action mapping (FR-011).
- Confirm `docs/manual-verification.md` has gained a "Standing checks" section
  holding the touch-only regression item, separate from the dated per-spec pass
  log, and that feature 007's spec is untouched (FR-012, FR-012a, FR-012b).
