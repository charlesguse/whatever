# Feature Specification: Top-Strip Controls Never Overlap

**Feature Branch**: `spec-draft/012-top-strip-layout`

**Created**: 2026-09-03

**Status**: Draft

**Input**: GitHub issue #35 — "HUD, mute button, and theme picker overlap at
phone width". Reported by the maintainer during the 007 manual pass on Chrome
on a Pixel 10 Pro in portrait: *"The mute and theme switcher overlay on the
score and lives portion."* Three independent screen-pinned elements share the
same strip along the top of the screen — the status readout (quota, time,
score, lives) pinned left, the mute control centered, and the theme picker
pinned right — with nothing measuring or reserving space between them. The
readout's width is whatever its text needs; the picker's width grows with the
number of registered themes and the length of their names. On a phone-width
viewport the three do not fit side by side, so they land on top of each other.
The comment that claims the mute control is "clear of the HUD readout
(top-left), the theme picker (top-right)" is a layout assumption that holds on a
desktop window and is never enforced, measured, or tested. The existing
right-edge inset for the theme picker does not help: it exists to clear the
landscape reserved margin, and in portrait it reduces to a flat few pixels.

No test caught it because none could. Feature 007 guarantees the *touch
controls* stay inside the safe-area box and never cover the cave, and it does so
structurally — a pure layout function carves the regions out and a node test
pins the result. The readout, the mute control, and the theme picker are outside
that system entirely: plain screen-pinned elements whose positions live in a
stylesheet, so no pure function describes where they land and no node test can
fail when they collide.

The issue asks for the structural fix, not the pixel patch: this is the third
defect in the same family (after #31 and 008's SC-009 gap), where a guarantee
holds by convention at a call site or in a stylesheet rather than by something
the suite can hold up. The top strip's occupants should be placed by the same
kind of measured, pure layout function the touch controls already use, so that
"these controls never overlap each other, and never overlap the readout" becomes
a property a node test asserts at phone widths. The issue also asks that 007's
Maintainer Review Notes gain the matching by-hand item, which today has no
entry for this check.

This spec changes no physics, no cave, and no theme data. It moves three
positions out of a stylesheet and into a rule, and pins the rule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A phone screen where nothing sits on anything (Priority: P1)

A player picks up a phone in portrait, opens the game, and starts cave one. The
readout along the top tells them how many diamonds they have of the quota, how
much time is left, their score, and their lives — every character of it legible,
none of it behind a button. The mute control is a whole button they can see and
press. The theme buttons are whole buttons they can see and press, and pressing
one switches the theme rather than doing nothing because a different element was
on top at that point. They can read the score while they play and find the mute
control without hunting, on the narrowest phone the game supports.

**Why this priority**: This is the reported defect, and it is the entire
feature. Everything below is this same property under rotation, under more
themes, and under a test that keeps it true.

**Independent Test**: With no browser, drive the placement rule as a pure
function from an available screen box plus each occupant's measured natural size
to one box per occupant, and assert over a set of viewport boxes covering the
narrowest supported size that no two returned boxes intersect and every box lies
fully inside the available box. Legibility of the actual rendered text is the
maintainer's check — see "Maintainer Review Notes".

**Acceptance Scenarios**:

1. **Given** the narrowest supported viewport in portrait, **When** the readout,
   the mute control, and the theme picker are placed, **Then** no two of their
   boxes intersect by even one pixel.
2. **Given** that same viewport, **When** the three are placed, **Then** each
   one lies entirely inside the available screen box, including under a notch or
   home-indicator inset.
3. **Given** a cave in play, **When** the score reaches its largest displayed
   value and the readout is at its widest, **Then** the property still holds —
   the rule reacts to the readout's measured width rather than an assumed one.
4. **Given** the title screen, whose readout line carries the high score and the
   furthest cave reached rather than the in-play values, **When** it is placed,
   **Then** the property still holds for that longer line.
5. **Given** a screen where the readout is not shown at all, **When** the mute
   control and theme picker are placed, **Then** neither overlaps the other and
   neither is pushed off the available box.
6. **Given** any placement the rule returns, **When** a player taps the mute
   control or a theme button, **Then** the tap reaches that control — no other
   occupant's box covers any part of its hit target.
7. **Given** the same inputs twice, **When** the rule runs, **Then** it returns
   the same boxes — placement is deterministic, with no dependence on the tick,
   the clock, or randomness.

---

### User Story 2 - Rotate the phone and it still holds (Priority: P2)

A player rotates the phone mid-cave. The cave reflows, the on-screen touch
controls move from the bottom band to the side margins, and the top strip
reflows with them: the readout, the mute control, and the theme picker are still
three separate, whole, tappable things, and none of them is stranded under a
thumb margin where the touch controls live. They rotate back and the same is
true. They open the game on a small tablet, a large phone, and a desktop window,
and each one is a sane arrangement rather than a pile.

**Why this priority**: The bug was found by rotating a real device, and the
listeners that would drive the reflow already exist for the touch layout.
Without this, the fix is a portrait-only fix.

**Independent Test**: Run the same pure placement rule over landscape boxes,
including boxes where the touch controls' reserved margins are active, and
assert the same non-overlap and containment properties plus a third: no
occupant's box intersects any reserved touch-control region.

**Acceptance Scenarios**:

1. **Given** the narrowest supported viewport in landscape with the on-screen
   touch controls visible, **When** the three are placed, **Then** none of them
   intersects either reserved control margin, and none intersects another.
2. **Given** a portrait viewport with the touch controls visible, **When** the
   three are placed, **Then** none of them intersects the reserved bottom band,
   and none intersects another.
3. **Given** the game in portrait, **When** the device is rotated to landscape,
   **Then** the placement is recomputed from the new measurements and the
   property holds in the new orientation.
4. **Given** a desktop browser window, **When** it is resized from wide to
   narrow and back, **Then** the property holds at every size it passes through.
5. **Given** a viewport wide enough for all three at their natural sizes,
   **When** they are placed, **Then** the arrangement is the familiar one —
   readout toward the leading edge, theme picker toward the trailing edge, mute
   control between them — so nothing about the desktop presentation regresses.
6. **Given** a resize or rotation, **When** the placement is recomputed,
   **Then** it is recomputed once per such event, not once per frame and not
   once per simulation tick.

---

### User Story 3 - A third theme does not break the strip (Priority: P3)

A contributor adds a third theme. It appears in the picker beside Classroom and
Classic, with its own name. On a phone the top strip is still three separate,
whole, tappable things — the arrangement absorbed the extra button rather than
pushing the readout under it. They add a fourth with a long name and the same
holds. They never touch the placement rule to make this true.

**Why this priority**: The constitution makes adding a theme a data-only change,
and the issue names this explicitly: the picker's width grows with the number of
registered themes, so a rule that assumes two is a rule that breaks on three.
It is P3 only because two themes ship today.

**Independent Test**: Run the placement rule with theme pickers of varying
measured widths — standing in for one, two, three, and four themes, and for a
theme with an unusually long name — at the narrowest supported viewport, and
assert the same non-overlap and containment properties for every one.

**Acceptance Scenarios**:

1. **Given** any number of registered themes from one upward, **When** the three
   occupants are placed at the narrowest supported viewport, **Then** the
   non-overlap and containment properties hold.
2. **Given** a theme whose displayed name is much longer than the shipped ones,
   **When** the picker is placed, **Then** the property still holds.
3. **Given** a registry with a single theme, where no picker is shown, **When**
   the remaining two occupants are placed, **Then** the property holds and the
   freed space is available to them.
4. **Given** the placement rule, **When** it is inspected, **Then** it branches
   on no theme id and reads no theme data beyond the measured size of the
   picker — a longer name changes a measurement, never a code path.
5. **Given** a hypothetical third theme added to the registry, **When** the
   build and suite run, **Then** the only changed files are that theme's data
   and its registry entry.

---

### User Story 4 - A guarantee the suite can hold up (Priority: P4)

A contributor moves the mute control, or renames a theme, or adds a field to the
readout. If that change would put two of the top strip's occupants on top of
each other at phone width, the suite fails on their machine and in CI, on a
runner with no browser — before a maintainer has to find it on a real phone
again. Nothing about where these three land is decided by a comment asserting
that they are clear of one another.

**Why this priority**: The issue asks for exactly this and names it as the third
occurrence of the same class of defect. It is last only because it is a property
of how the other three stories are built rather than a capability a player sees.

**Independent Test**: The placement rule is exercised directly in the existing
node-only environment, with no DOM, no canvas, and no browser automation, and
its properties are asserted over the pinned viewport set. A deliberate
regression — pinning one occupant to a fixed position that ignores the others —
fails those assertions.

**Acceptance Scenarios**:

1. **Given** the test suite, **When** an occupant's placement is changed so two
   overlap at the narrowest supported viewport, **Then** the suite fails.
2. **Given** the test suite, **When** it runs, **Then** it needs no browser, no
   canvas, and no added test infrastructure.
3. **Given** the shipped build, **When** it is inspected, **Then** it is still a
   single self-contained `index.html` that plays from `file://`, with no added
   runtime dependency.
4. **Given** the diff, **When** it is reviewed, **Then** it touches no file
   under `src/sim/` and changes no physics rule, cave, theme table, or input
   binding.
5. **Given** 007's Maintainer Review Notes, **When** they are read after this
   feature, **Then** they carry an item for confirming by hand that the readout,
   the mute control, and the theme picker do not overlap at phone width in both
   orientations.

---

### Edge Cases

- **The narrowest supported viewport with the longest possible content**: the
  widest readout line and the widest picker at once. This is the case the rule
  is written for, not an exception to it; if the three cannot fit at their
  natural sizes, the arrangement degrades under FR-012 and the property still
  holds.
- **A readout that is wider than the whole screen on its own**: the readout
  gets the space that remains after the other two are placed, and is shortened
  to fit rather than allowed to run under them.
- **A theme name long enough that one theme button alone fills the strip**: the
  picker degrades under FR-012 like any other over-wide occupant; a theme's data
  can never push another occupant off the screen.
- **No readout on screen** (cave intro, life lost, game over on some screens):
  the other two are placed as if the strip were otherwise empty, and still do
  not overlap each other.
- **One registered theme**: no picker exists to place, and the rule must not
  assume a third occupant is always there.
- **Non-zero safe-area insets**: a notch, a rounded corner, or a home indicator
  shrinks the available box, and every occupant stays inside the smaller box.
- **Landscape with the touch controls visible**: the reserved thumb margins run
  the full height of the screen on both sides, so they cut into the top strip
  too — occupants stay clear of them.
- **A very short landscape viewport**: the strip's height plus the reserved
  regions may leave little room; the rule must still return boxes that satisfy
  every property, even when what is left for the cave is small.
- **Rotation with a finger down on the mute control**: the placement moves under
  the finger; the press either completes on the control it started on or does
  nothing, and never activates a different control that moved into that spot.
- **A resize that arrives while a previous measurement is still in effect**:
  placement is a function of the latest measurement only, and repeated
  measurement of an unchanged screen returns an unchanged arrangement — the rule
  cannot oscillate between two arrangements on successive measurements.
- **A degenerate available box** (zero or near-zero width or height, as a
  browser can briefly report mid-rotation): the rule returns boxes rather than
  failing, and no box escapes the available box.
- **Desktop, unchanged**: at a wide window the arrangement is the one players
  have today, so this fix is invisible to anyone who never hit the bug.

## Requirements *(mandatory)*

### Functional Requirements

**One measured placement rule**

- **FR-001**: The system MUST place the three top-strip occupants — the status
  readout, the mute control, and the theme picker — through a single placement
  rule. No occupant's position may be decided by a stylesheet constant that
  assumes where the other two land.
- **FR-002**: The placement rule MUST be a pure function of its inputs, with no
  DOM access, no canvas, no clock, and no randomness, and MUST be verifiable in
  the existing node-only test environment with no browser and no added test
  infrastructure.
- **FR-003**: The rule's inputs MUST include the available screen box (the
  safe-area-inset box already measured for the touch controls), the regions
  currently reserved by the on-screen touch controls, and each occupant's
  natural size **as measured at runtime** — never a hard-coded width for text
  whose length varies.
- **FR-004**: The rule MUST return one box per occupant that is present, and
  those boxes MUST be what the shell uses to position them — the returned
  geometry is the placement, not a hint the stylesheet may override.
- **FR-005**: The rule MUST NOT branch on a theme id, a device model, a user
  agent, or a browser feature name. It sees sizes and counts only.
- **FR-006**: Placement MUST NOT read or alter simulation state, session state,
  score, clock, or tick count, and MUST NOT introduce any import from
  `src/sim/` into the placement rule or any Svelte, DOM, or audio import into
  `src/sim/`.

**The property**

- **FR-007**: For every supported viewport size, in both orientations, and for
  any number of registered themes, no two occupants' boxes may intersect.
- **FR-008**: Every occupant's box MUST lie entirely inside the available screen
  box.
- **FR-009**: When the on-screen touch controls are visible, no occupant's box
  may intersect any region those controls reserve.
- **FR-010**: The boxes compared for FR-007 through FR-009 MUST be the boxes
  that receive taps and clicks — including each occupant's padding and border,
  not just its text — so satisfying the property means no control can cover
  another's text or steal another's hit target.
- **FR-011**: No control's hit target may end up smaller as a result of this
  feature than it is today; the arrangement gives way before a tap target does.

**Growing with the number of themes**

- **FR-012**: When the occupants cannot all fit at their natural sizes, the
  arrangement MUST degrade by one stated, deterministic rule rather than by
  overlapping. [NEEDS CLARIFICATION: which degradation is wanted at phone width
  — shorten the theme buttons' labels, collapse the picker to a single control
  that cycles themes, or wrap the strip into a second row?]
- **FR-013**: Degradation MUST follow a stated priority: the readout stays
  readable during play (005 FR-021) and the mute control stays visible and
  operable on every screen (008 FR-041). The theme picker is the first occupant
  to give up space, and it MUST remain a way for a touch-only player to change
  theme however it degrades, so touch does not lose a capability keyboard and
  gamepad keep (Principle V).
- **FR-014**: The rule MUST hold for one registered theme and for any larger
  number, with the picker's contribution a function of its measured size — not
  of an assumed count of two.
- **FR-015**: Adding a theme MUST NOT require any change to the placement rule,
  to rendering, or to any file under `src/sim/`.

**Reflow**

- **FR-016**: Placement MUST be recomputed when the screen is resized and when
  the device orientation changes, reusing the listeners that already exist for
  the touch-control layout — no new per-element listener.
- **FR-017**: Placement MUST NOT be recomputed per frame or per simulation tick,
  and MUST NOT allocate in the tick loop.
- **FR-018**: Recomputation MUST be idempotent: measuring an unchanged screen
  again MUST yield the same arrangement, so the layout cannot oscillate between
  two states.
- **FR-019**: After any reflow, FR-007 through FR-010 MUST hold in the new
  orientation and at the new size.

**Not regressing what works**

- **FR-020**: At viewport sizes where all three fit at their natural sizes, the
  arrangement MUST remain the one that ships today — readout toward the leading
  edge, theme picker toward the trailing edge, mute control between them — so
  desktop presentation is unchanged.
- **FR-021**: Every existing behavior of these three controls MUST be preserved:
  the mute control still reports its pressed state to assistive technology, the
  theme picker still marks the active theme and still reports it, and activating
  either still does exactly what it does today. This feature changes where they
  are, not what they do.
- **FR-022**: No physics rule, cave, theme table, input binding, or existing
  test expectation may change, and the build MUST remain a single
  self-contained `index.html` playable from `file://` with no added runtime
  dependency.

**Coverage this feature owes**

- **FR-023**: A node test MUST assert FR-007 through FR-010 over a pinned set of
  viewport boxes that includes the narrowest supported viewport in both
  orientations [NEEDS CLARIFICATION: what is the narrowest viewport the game
  supports — 320 CSS px wide, 360, or the reporter's ~412 px device as the
  floor?], both with and without the touch controls' reserved regions, and over
  a range of occupant sizes standing in for one through four themes and for an
  unusually long theme name.
- **FR-024**: 007's Maintainer Review Notes MUST gain an item instructing the
  maintainer to confirm on a real phone, in both orientations, that the readout,
  the mute control, and the theme picker do not overlap and that each is fully
  legible and tappable.

### Key Entities

- **Top-Strip Occupant**: one of the three things that share the top strip — the
  status readout, the mute control, the theme picker. Each has a measured
  natural size, a minimum size it will not shrink below, and a stated priority
  used when space runs out. The set is closed; adding a fourth occupant is a
  spec change.
- **Available Screen Box**: the safe-area-inset box already measured for the
  touch controls — the region every occupant must stay inside.
- **Reserved Region**: a rectangle the on-screen touch controls occupy, which no
  top-strip occupant may enter. Zero of them when the touch controls are hidden.
- **Top-Strip Placement**: the rule's output — one box per present occupant,
  which the shell applies directly. It is a pure function of the available box,
  the reserved regions, and the occupants' measured sizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across the pinned viewport set — narrowest supported size in both
  orientations, with and without touch controls, across occupant sizes standing
  in for one through four themes — zero pairs of occupant boxes intersect, and
  100% of boxes lie inside the available box and outside every reserved region.
  Enforced by a node test, not by inspection.
- **SC-002**: On the reporting device (a Pixel 10 Pro in portrait, Chrome), all
  four readout values, the mute control, and every theme button are fully
  visible and individually tappable — the reported defect is gone, confirmed by
  the maintainer.
- **SC-003**: Rotating a real phone mid-cave leaves all three occupants
  separate, whole, and clear of the thumb margins, in both orientations,
  confirmed by the maintainer.
- **SC-004**: Adding a fully themed third entry to the registry changes only
  that theme's data file and its registry entry, and the pinned test still
  passes at the narrowest supported viewport — demonstrated by the test's
  parameterization over occupant sizes, not by shipping a third theme.
- **SC-005**: A deliberate regression that places any one of the three at a
  fixed position ignoring the others fails the suite on a runner with no
  browser.
- **SC-006**: Every test that passed before this feature still passes unchanged,
  and `dist/` still holds exactly one self-contained `index.html`.
- **SC-007**: At a desktop window width, the top strip is visually
  indistinguishable from the pre-feature build, confirmed by the maintainer.
- **SC-008**: 007's Maintainer Review Notes contain the overlap item, so the
  next manual pass checks it by instruction rather than by luck.

## Maintainer Review Notes

CI has no browser, so what a real screen looks like is verified by hand at
review time, per Principle VII. With the game running from `dist/index.html`
opened via `file://`:

**On a real phone, both orientations:**

1. Start a cave and read the whole readout — diamonds of quota, time, score,
   lives. Every character legible, nothing behind a button.
2. Press the mute control, then each theme button. Each press lands on the
   control you aimed at, and the theme actually changes.
3. Rotate mid-cave with a thumb on the screen. Confirm all three are still
   separate and whole, that none has landed under a thumb margin where the
   touch controls live, and that the run continues.
4. Play into a high score so the readout grows to its widest, and confirm
   nothing starts overlapping as it does.
5. Look at the title screen, whose readout line is the longest one in the game,
   and confirm it too is clear of the other two.
6. If the arrangement degrades at this width under FR-012, confirm the degraded
   form is still obvious: you can tell what the buttons do and you can still
   reach every theme.

**On the narrowest device to hand:**

7. Repeat items 1 and 2. This is the case the whole feature is about; if
   anything is going to touch, it touches here.

**On a desktop window:**

8. Confirm the top strip looks exactly as it did before this feature, and resize
   the window slowly from wide to narrow — nothing should ever overlap on the
   way through, and the change into the narrow arrangement should not flicker
   back and forth at the width where it switches.

**In the diff:**

9. Confirm no file under `src/sim/` changed, no theme id appears in placement or
   rendering code, and the three positions now come from the placement rule
   rather than from fixed stylesheet offsets.

## Assumptions

- **The strip's occupants stay overlays**: this feature does not reserve
  vertical space at the top of the screen or shrink the cave for the readout and
  the controls. The reported defect is control-on-control overlap; changing how
  much cave a player sees on every device, including desktop, is a bigger change
  than the issue asks for and would change what every cave looks like.
- **The centered status banner is out of scope**: it is centered on the screen,
  transient, and not part of the top strip. So are the touch controls
  themselves, which already have their own layout and their own tests — this
  feature only requires that the strip stays clear of the regions they reserve.
- **The available box is the one already measured**: the safe-area-inset box the
  touch layout reads today, refreshed by the same resize and orientationchange
  listeners. No new measurement source is introduced for the screen itself.
- **Occupant sizes are measured in the shell**: text width depends on the font
  the browser actually used, so natural sizes are measured at runtime and handed
  to the rule as plain numbers. The rule itself stays free of the DOM, which is
  what keeps it testable without a browser.
- **The widest readout is the title screen's line**: the high score plus
  furthest cave line is longer than the in-play line, and is covered by the same
  measurement path rather than special-cased.
- **Bindings are untouched**: the mute key, the cycle-theme key, and every
  gamepad binding stay exactly as they are. A keyboard or gamepad player can
  already reach mute and theme switching without the on-screen controls, and
  that does not change.
- **The three occupants are the whole set**: nothing else is added to the top
  strip by this feature. If a later feature wants a fourth, it declares it as an
  occupant with a size and a priority rather than pinning it in a stylesheet.
- **Degradation is a layout change, not a capability change**: whatever form
  FR-012 takes, every theme stays reachable by touch and mute stays one tap
  away. A degraded strip is smaller, never shorter on function.
- **No new dependency, no browser test harness**: the property is asserted over
  a pure function in the existing suite, in keeping with Principle VII's
  prohibition on browser-automation test infrastructure.
- **Nothing leaves the device**: this feature adds no network use and no new
  persisted value.
