# Feature Specification: The Readout Always Fits Its Box

**Feature Branch**: `spec-draft/013-readout-overflow-policy`

**Created**: 2026-09-04

**Status**: Draft

**Input**: GitHub issue #43 — "Top strip: readout can overflow its pinned-height
band below ~412px (no white-space/overflow/text-overflow policy)". Raised by the
maintainer during the cycle-3 review of PR #41 (spec 012, top-strip layout), and
explicitly *not* a blocker for that PR.

Spec 012 made the top strip's three occupants — the status readout, the mute
control, the theme picker — the output of one measured placement rule, and
pinned "no two boxes intersect, every box lies inside the available box" as a
node-testable property. That property is about the occupants' **boxes**, and it
holds. What 012 never stated is what the *contents* of a box do when the box is
smaller than the content needs, and that gap is now visible on real phones.

The readout is the one occupant the rule is allowed to shrink: FR-013 makes the
theme picker collapse first and forbids the mute control from shrinking at all,
so when space runs out the readout's **width** is capped to whatever is left.
Its **height**, meanwhile, comes from a hidden natural-size probe that was
measured before the cap existed. The two numbers describe different boxes, and
below about 412 CSS px they disagree:

| viewport | readout width cap | probe-pinned height | height the capped width needs | spill |
| --- | --- | --- | --- | --- |
| 412 | 244.6 | 44px (2 lines) | 44px | 0 |
| 360 | 192.6 | 44px | 62px | 18px |
| 320 | 152.6 | 44px | 80px | 36px |

(Maintainer's live measurements: in-play readout string, natural width 434.5px,
mute 45.4px, collapsed picker 90px.)

At 412 px — the reporting device for #35, and the width 012 was reviewed on —
the probe already wraps to two lines, the band is sized for two lines, and the
text stays inside its dark background. SC-002 holds there and this feature must
keep it holding. Below 412, still inside the range 012 committed to (FR-023:
320 CSS px on the short edge), the capped box needs more lines than the probe
measured, and the extra lines render *outside* the readout's background — white
text directly on the cave, unreadable and untested. The shipped `.readout` rule
carries no `white-space`, `overflow`, or `text-overflow` declaration, so nothing
stops it.

This is the same shape of defect as #31, #35, and 008's SC-009: a guarantee that
held by convention on the screen it was written on, with no rule to make it hold
elsewhere and no test that could fail when it stopped. 012 fixed that for
*where the boxes go*. This spec fixes it for *what is inside them*: an occupant's
placed box must be sized for the content it will actually be asked to render,
the rendering must be physically incapable of painting outside its own box, and
both must be properties the node suite asserts rather than facts about one
phone.

This spec changes no physics, no cave, and no theme data.

## Clarifications

### Session 2026-09-05 — maintainer review on issue #43

- **FR-011, overflow policy**: **grow-then-elide, as drafted**. One-line ellipsis
  drops values at 320 px and contradicts 005 FR-021 and 012 SC-002, which both
  require all four readout values visible; clipping with no indication is
  undiagnosable from a bug report; theme-provided short labels add a
  theme-contract field for a problem that is not about theming and do not help
  the case that actually lengthens the string, a five-digit score.
- **FR-009, growth ceiling**: **one third of the available box height stands** —
  measurable, testable without a browser, and generous enough never to bind in
  practice. Restated as a backstop that should never be reached rather than a
  budget to spend, so that routinely hitting it reads as an alarm.
- **FR-016 / FR-016a / FR-016b and SC-006, settling**: the width/height feedback
  loop is severed **structurally rather than by bounding iterations**. The band's
  usable width is computed from the growth allowance rather than from the height
  the band achieves, which makes the placement graph acyclic and placement
  single-pass; idempotence becomes provable from the rule's inputs instead of
  asserted by watching it converge. The shell's two DOM measurement passes are a
  measurement detail with a fixed count, not a convergence loop.
- **FR-017**: "byte-for-byte" replaced with "visually indistinguishable" — an
  arrangement is not bytes, and SC-004 already states the testable form.
- **SC-002**: the 18 px and 36 px spill figures are reference measurements of one
  string in one build, and must not be hard-coded by a test as expected values.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The whole readout, inside its own box, on a small phone (Priority: P1)

A player opens the game on a 360 px-wide phone — or a 320 px one, the narrowest
the game supports — and starts cave one. The readout along the top tells them
diamonds-of-quota, time, score, and lives. Every character of it sits on the
readout's own dark background: the band is as tall as the text needs at the
width it was given, so nothing trails off the bottom edge onto the cave. They
play into a five-digit score and the readout grows to hold it rather than
spilling out of itself. They rotate to landscape and the same is true.

**Why this priority**: This is the reported defect and the whole feature. Every
story below is this same property under a different occupant, a harsher
viewport, or a test that keeps it true.

**Independent Test**: Drive the placement rule as a pure function with occupant
sizes that include a *height-for-width* relationship (a plain stand-in for what
the browser's text metrics report, supplied as data — no DOM), over the pinned
viewport set including 320, 360, and 412 px, and assert that each returned box
is at least as tall as the content needs at that box's width, while every 012
property still holds.

**Acceptance Scenarios**:

1. **Given** a 320 px-wide portrait viewport and the in-play readout string,
   **When** the readout is placed, **Then** its box is tall enough for that
   string at the width the box was given, and no glyph renders outside the box.
2. **Given** a 360 px-wide portrait viewport, **When** the readout is placed,
   **Then** the same holds — the case that spills 18 px today.
3. **Given** the 412 px reporting device, **When** the readout is placed,
   **Then** the result is what ships today: a two-line band with the text inside
   it, so 012's SC-002 is not regressed.
4. **Given** a cave in play, **When** the score, the diamond count, and the
   timer all reach their widest displayed values, **Then** the box grows to
   hold the longer string rather than the string escaping the box.
5. **Given** the title screen, whose readout line carries the high score and the
   furthest cave reached and is the longest line in the game, **When** it is
   placed at 320 px, **Then** it too is fully inside its own box.
6. **Given** a desktop-width window where the readout is placed at its full
   natural width, **When** it renders, **Then** it is a single line and looks
   exactly as it does today — the fit rule changes nothing where nothing was
   capped.
7. **Given** any placement, **When** a player looks at the readout, **Then**
   every value that is displayed is displayed in full — fitting the box is
   achieved by sizing the box, not by silently dropping values.

---

### User Story 2 - A taller readout does not disturb the rest of the strip (Priority: P2)

The readout grows to two or three lines on a narrow phone. The mute control and
the theme control stay exactly where they were — they do not drift downward to
stay centered against a band that got taller, and they do not start overlapping
the readout, each other, the touch controls' thumb margins, or the edges of the
screen. The player's thumb finds mute in the same place at 320 px as at 412 px.
Nothing flickers: the strip settles once and stays settled.

**Why this priority**: A fix that makes the readout fit by moving the other two
controls would re-open the defect 012 exists to close. This story is what keeps
the fix additive rather than a trade.

**Independent Test**: Run the rule over the pinned viewport set with readout
content ranging from one line to the tallest the cap permits, and assert that
the mute and picker boxes are identical to the ones produced for the one-line
case, that all 012 properties (non-overlap, containment, clear of reserved
regions) still hold, and that re-running the rule on its own output returns the
same arrangement in a single pass — with no iteration to converge.

**Acceptance Scenarios**:

1. **Given** two placements that differ only in how many lines the readout
   needs, **When** they are compared, **Then** the mute control's box and the
   theme picker's box are identical in both.
2. **Given** a readout grown to its tallest permitted size, **When** the strip
   is placed, **Then** no two occupant boxes intersect and every box lies inside
   the available box.
3. **Given** landscape with the on-screen touch controls visible, **When** a
   grown readout is placed, **Then** its box does not intersect either reserved
   thumb margin.
4. **Given** portrait with the touch controls visible, **When** a grown readout
   is placed, **Then** its box does not intersect the reserved bottom band, and
   the cave and the controls below remain reachable.
5. **Given** the arrangement the rule returns, **When** placement is recomputed
   from the same measurements, **Then** it returns the same arrangement — and it
   does so because the readout's achieved height is not an input to the layout
   at all, so there is no feedback that could make the strip oscillate between a
   tall and a short state.
6. **Given** a grown readout, **When** the theme picker's collapse decision is
   made, **Then** it is still made from natural (unwrapped) sizes as 012 FR-012a
   requires — a readout that wraps must not change whether the picker collapses.
7. **Given** a resize or rotation, **When** the strip is recomputed, **Then**
   the shell measures a fixed two times — natural sizes, then heights at the
   capped widths — places once from those numbers, and does not recompute per
   frame or per simulation tick.

---

### User Story 3 - Any occupant that has to shrink still fits its content (Priority: P3)

A contributor adds a theme with a long display name. At 320 px the collapsed
cycle control carrying that name is wider than the space the strip can give it,
so its box is clamped — and its label stays inside the clamped box, elided
rather than painted across the cave. The same is true of any occupant the rule
ever has to place smaller than its natural size. Nobody has to remember which
occupants can be shrunk this month.

**Why this priority**: The readout is the only occupant capped *today*, but 012's
own edge cases already anticipate a collapsed control that is still too wide,
and its containment clamp can shrink any box. Writing the policy per-occupant is
how this defect comes back with a different name; writing it as a property of
"an occupant whose placed box is smaller than its natural size" is how it does
not. It is P3 only because no shipped theme triggers it.

**Independent Test**: Run the rule at 320 px with a collapsed picker size and a
mute size larger than the space available, and assert that every returned box
still lies inside the available box and that each is flagged as capped, so the
shell knows which occupants must render in fit-to-box mode.

**Acceptance Scenarios**:

1. **Given** a theme whose display name makes the collapsed control wider than
   the strip can allow, **When** it is placed at 320 px, **Then** its box is
   inside the available box and its label does not render outside that box.
2. **Given** any occupant whose placed box is narrower or shorter than its
   natural size, **When** it renders, **Then** its content is contained by the
   box — no occupant is exempt from the policy.
3. **Given** a control whose label is elided, **When** a player looks at it,
   **Then** it is still evident that the control is truncated rather than
   mysteriously short, and it is still operable at no less than today's hit
   target size (012 FR-011).
4. **Given** a theme added to the registry, **When** the build and suite run,
   **Then** the only changed files are that theme's data and its registry entry
   — this policy is not a new place a theme has to be accounted for.

---

### User Story 4 - A guarantee the suite can hold up (Priority: P4)

A contributor changes the readout's font, adds a fifth value to it, or tightens
its padding. If that change would make the content need more room than its box
has at any supported width, the suite fails on their machine and in CI, on a
runner with no browser — before a maintainer finds white text on the cave at
360 px again. Whether the readout fits stops being a fact about one device.

**Why this priority**: The issue is a review finding about an untested gap; a fix
with no test recreates the gap for the next person. Last only because it is a
property of how the stories above are built rather than something a player sees.

**Independent Test**: The fit properties are asserted in the existing node-only
environment against the pure rule, with text metrics supplied as data. A
deliberate regression — pinning the readout's height to its unwrapped natural
height regardless of the width it is given, which is exactly today's bug — fails
those assertions.

**Acceptance Scenarios**:

1. **Given** the suite, **When** the readout's placed height is made independent
   of its placed width, **Then** the suite fails at 360 px and at 320 px.
2. **Given** the suite, **When** it runs, **Then** it needs no browser, no
   canvas, and no added test infrastructure.
3. **Given** the shipped build, **When** it is inspected, **Then** it is still a
   single self-contained `index.html` that plays from `file://` with no added
   runtime dependency.
4. **Given** the diff, **When** it is reviewed, **Then** it touches no file
   under `src/sim/` and changes no physics rule, cave, theme table, or input
   binding.
5. **Given** every test that passed before this feature, **When** the suite runs,
   **Then** all of them still pass — 012's non-overlap, containment, and
   idempotence assertions included, unchanged.
6. **Given** `docs/manual-verification.md`, **When** it is read after this
   feature, **Then** its existing "Standing checks" section carries an item for
   confirming by hand that no top-strip occupant's content renders outside its
   own background, at the narrowest device to hand.

---

### Edge Cases

- **320 px portrait with the longest in-play string**: the case the maintainer
  measured as spilling 36 px. The box is sized for the three lines the text
  needs; nothing renders outside it.
- **A readout that would need more height than it is allowed to take**: growth
  is bounded (FR-009), so past that bound the content itself gives way — elided
  inside the box, never painted outside it. The box's containment is absolute;
  the amount of text shown is not.
- **A degenerate available box** (zero or near-zero width or height, as a
  browser can briefly report mid-rotation): the rule returns boxes rather than
  failing, no box escapes the available box, and no content escapes its box.
- **A very short landscape viewport** where the bounded growth allowance is
  itself only one line tall: the readout renders one line, elided, and the strip
  still satisfies every 012 property.
- **Text metrics that are unavailable or report zero** (a font that has not
  loaded, a measurement taken before layout settles): the rule falls back to a
  size that cannot spill — content is contained even when the measurement is
  useless.
- **A font that renders wider than the one measured** (a user's font-size
  override, a platform substitution): the rendering-side containment holds
  regardless, so a mis-measurement degrades to elision rather than to spill.
- **The title screen line, the in-play line, and a paused screen line**: all are
  the same occupant measured the same way, with no per-screen special case.
- **A capped width that happens to fit on one line anyway** (a wide-enough
  phone, a short score): the readout stays one line and looks as it does today —
  growth is a consequence of need, not a new baseline.
- **A resize arriving while a height measurement for the previous width is still
  in effect**: placement is a function of the latest measurement only, computed
  in one pass, so a stale height is replaced rather than chased.
- **Desktop, unchanged**: at a wide window nothing is capped, so nothing wraps,
  elides, or grows, and the strip is visually identical to today's.

## Requirements *(mandatory)*

### Functional Requirements

**Content stays inside its box**

- **FR-001**: No top-strip occupant may render any part of its content outside
  the box the placement rule returned for it, at any supported viewport size, in
  either orientation, on any screen the game shows. This is an absolute
  property: it holds even when the box is too small, even when a measurement was
  wrong, and even when the font is not the one that was measured.
- **FR-002**: FR-001 MUST be enforced structurally by the rendering of the
  occupant itself — the box clips its own content — and not solely by the box
  having been sized correctly. Correct sizing (FR-004) and clipping (FR-002) are
  belt and braces: a sizing mistake must degrade to less text shown, never to
  text on the cave.
- **FR-003**: The status readout MUST show every value it displays in full
  whenever the box permits; shortening what is displayed is a last resort under
  FR-010, never the first response to a narrow screen.

**Boxes are sized for the content they will hold**

- **FR-004**: An occupant's placed box MUST be at least as large as its content
  needs **at the width that box was actually given** — not at the occupant's
  unconstrained natural width. Where the placement rule caps an occupant's
  width, the height it places that occupant at MUST be the height that capped
  width requires.
- **FR-005**: The natural size an occupant reports for 012's fit and collapse
  decisions (FR-012a) MUST be its true unconstrained size — the size its content
  takes on a single line with no wrapping — so that "does the strip fit at
  natural sizes" is answered against sizes that do not themselves depend on the
  current viewport. A natural-size measurement that is silently wrapped by the
  viewport it is measured in is not a natural size.
- **FR-006**: The placement rule MUST remain a pure function with no DOM access,
  no canvas, no clock, and no randomness, verifiable in the existing node-only
  environment. Any text measurement happens in the shell and enters the rule as
  plain numbers — including whatever describes how tall an occupant's content is
  at a given width.
- **FR-007**: The rule MUST NOT read or alter simulation state, session state,
  score, clock, or tick count, and MUST NOT introduce any import from `src/sim/`
  into the layout module or any Svelte, DOM, or audio import into `src/sim/`.
- **FR-008**: The rule MUST NOT branch on a theme id, a device model, a user
  agent, a browser feature name, or a specific viewport width. 320, 360, and 412
  are sizes the tests cover, never sizes the rule recognizes.

**How much an occupant may grow, and what happens past that**

- **FR-009**: An occupant's box MAY grow beyond its natural height to satisfy
  FR-004, bounded so that the grown box still lies entirely inside the available
  box, still clears every region the on-screen touch controls reserve, and still
  leaves the cave playable. The bound is at most **one third of the available
  box's height**. This ceiling is a **backstop, not a budget**: at 320 px the
  measured need is about 80 px, and even a phone in landscape leaves room for
  roughly four lines inside the bound, so in normal operation the bound is never
  reached. A change that starts routinely hitting the ceiling — and so routinely
  eliding under FR-010 — is a signal that the readout's content has outgrown the
  strip, not a normal outcome to be accommodated by raising the bound.
- **FR-010**: When an occupant's content cannot fit even at the FR-009 bound,
  the content MUST be reduced to fit — elided with a visible indication that it
  is truncated — while FR-001 continues to hold. The box never yields, and the
  arrangement never yields; only the amount of text shown yields.
- **FR-011**: The policy for a capped occupant MUST be **grow the box to fit the
  content, then elide what still does not fit**, applied uniformly to every
  occupant the rule places smaller than its natural size. It MUST NOT be
  configured per occupant, per theme, or per screen. The three alternatives the
  issue named are rejected on the record: a one-line ellipsis drops values at
  320 px, contradicting 005 FR-021 and 012 SC-002, which both require all four
  readout values visible; clipping with no indication hides text with nothing to
  signal it is hidden, which is undiagnosable from a bug report; and
  theme-provided short-form labels add a theme-contract field for a problem that
  is not about theming and does not help the case that actually lengthens the
  string — a five-digit score. Grow-then-elide keeps every value visible in
  every realistic case and lets FR-001 be absolute in the ones nobody predicted.
- **FR-012**: No occupant's hit target may end up smaller than it is today as a
  result of this feature (012 FR-011), and no control may become unreachable or
  unlabelled because its content was elided.

**Not disturbing what 012 established**

- **FR-013**: The mute control's and the theme picker's placed boxes MUST NOT
  depend on the readout's height. A readout that grows from one line to three
  moves neither of them.
- **FR-014**: Every property 012 pins MUST continue to hold with a grown box in
  play: no two occupant boxes intersect (012 FR-007), every box lies inside the
  available box (012 FR-008), no box intersects a reserved touch-control region
  (012 FR-009), and the boxes compared are the ones that receive taps (012
  FR-010).
- **FR-015**: The theme picker's expanded-versus-collapsed decision MUST remain a
  function of natural sizes only (012 FR-012a). Whether the readout wraps MUST
  NOT change that decision in either direction.
- **FR-016**: The arrangement MUST be a **single-pass** function of (available
  box, reserved regions, natural sizes, height-for-width metrics), with **no
  fixed-point iteration**. Idempotence (012 FR-018) is therefore structural, in
  the same way 012 FR-012a's collapse decision is: it follows from the rule
  reading only its inputs, not from watching a loop converge.
- **FR-016a**: To make FR-016 achievable, the band's usable width MUST be
  computed from the **growth allowance** — the maximum height the band may reach
  under FR-009 — and never from the height the band actually achieves. Today's
  only cycle runs: achieved band height → which reserved regions overlap the
  band vertically → the band's usable width → the readout's width cap → the
  readout's height at that cap → achieved band height. Subtracting reserved
  regions against the allowance rather than the achievement severs that cycle at
  its only closing edge, because the allowance depends on inputs alone. Every
  other edge is already acyclic: the readout's cap is computed against the mute
  control's and the picker's *natural* widths (012 step 4), and FR-013 keeps
  their boxes independent of the readout's height. It is not enough that the
  loop would not oscillate on the device shapes checked so far — that is exactly
  the class of guarantee 012 exists to eliminate, and an iteration count is a
  convention no node test can fail when a later change breaks it.
- **FR-016b**: The shell MAY take a **fixed count of two** DOM measurement
  passes per resize, orientation change, or content change — natural sizes
  first, then heights at the capped widths — and MUST take no more. That is a
  measurement detail with a fixed count, not a convergence loop: placement
  itself is computed once, from those numbers. There MUST be no recomputation
  per frame or per simulation tick.
- **FR-017**: At viewport sizes where nothing is capped, the rendered result MUST
  be visually indistinguishable from the arrangement that ships today: a
  single-line readout, the familiar leading/centre/trailing positions (012
  FR-020), no wrapping and no elision.
- **FR-018**: Every existing behavior of the three controls MUST be preserved —
  the mute control still reports its pressed state to assistive technology, the
  theme picker still marks and reports the active theme, activating either still
  does exactly what it does today. Where content is elided visually, the full
  text MUST still be available to assistive technology.
- **FR-019**: No physics rule, cave, theme table, input binding, or existing test
  expectation may change, and the build MUST remain a single self-contained
  `index.html` playable from `file://` with no added runtime dependency.

**Coverage this feature owes**

- **FR-020**: A node test MUST assert FR-004 — that every returned box is at
  least as large as its content needs at that box's width — over a pinned
  viewport set that includes **320, 360, and 412 CSS px** on the short edge in
  both orientations, with and without the touch controls' reserved regions, and
  across occupant sizes standing in for one through four themes and an unusually
  long theme name. 360 and 412 are pinned here specifically because they are the
  widths the maintainer measured: 412 is the width that passes today and must
  keep passing, 360 and 320 are the widths that spill.
- **FR-021**: A node test MUST pin the deliberate regression named in User Story
  4: placing an occupant at its unwrapped natural height regardless of the width
  it was given MUST fail at 360 px and 320 px.
- **FR-022**: A node test MUST pin FR-013 — that the mute and picker boxes are
  identical across readout contents of differing heights at the same viewport —
  and FR-016's single-pass idempotence, including FR-016a: an arrangement
  computed from a deliberately wrong achieved band height MUST be identical to
  one computed from the correct height, because the achieved height is not an
  input to the usable-width calculation.
- **FR-023**: The by-hand check MUST be recorded as an item in the existing
  **"Standing checks"** section of `docs/manual-verification.md`, alongside the
  012 item and clearly apart from the dated per-spec pass log, instructing the
  maintainer to confirm on the narrowest real device to hand, in both
  orientations, that no top-strip occupant's text renders outside its own
  background. The item also appears in this feature's own Maintainer Review
  Notes. Spec 012's Maintainer Review Notes MUST NOT be edited — a merged spec is
  the record of what that feature required.

### Key Entities

- **Occupant Content Size**: what an occupant's content needs, expressed as a
  size **for a given width** rather than as a single fixed size. This is the
  entity the current design is missing: today an occupant reports one natural
  size, and the rule caps its width without asking what that cap costs in
  height. Measured in the shell, handed to the rule as plain numbers.
- **Natural Size**: an occupant's unconstrained, single-line size, used only for
  012's fit and collapse decisions. Distinct from the size at a capped width,
  and never derived from a measurement the viewport was allowed to wrap.
- **Growth Allowance**: the bounded extra height an occupant's box may take to
  fit its content (FR-009), derived from the available box and the reserved
  regions. Zero when there is no room to grow. It is also what the reserved-region
  subtraction is computed against (FR-016a) — the allowance, never the height a
  box achieves — which is what keeps the placement graph acyclic and placement
  single-pass. Because it depends only on inputs, it is a backstop the rule
  reasons with, not a value the rule discovers.
- **Capped Occupant**: an occupant whose placed box is smaller than its natural
  size in either dimension. The set is data, not a hard-coded list — the readout
  is the only member today, and the policy applies to any future member without
  a code change.
- **Top-Strip Placement**: unchanged from 012 in shape — one box per present
  occupant, applied directly by the shell — now with each box sized for the
  content it will actually hold.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across the pinned viewport set — 320, 360, and 412 CSS px on the
  short edge in both orientations, with and without touch controls, across
  occupant sizes standing in for one through four themes — 100% of returned
  boxes are at least as large as their content needs at the width they were
  given, or are at the FR-009 bound with the content elided. Zero boxes spill.
  Enforced by a node test, not by inspection.
- **SC-002**: At 360 px and 320 px, the readout's rendered text is entirely on
  the readout's own background, with zero pixels of text on the cave —
  confirmed by the maintainer on a real device or a device-emulated width. The
  18 px and 36 px of spill measured today are the maintainer's reading of one
  string in one build: reference points for what the defect looks like, and
  explicitly NOT values any test may hard-code as expected.
- **SC-003**: At 412 px the rendered result is unchanged from the current build:
  a two-line readout with its text inside the band. Spec 012's SC-002 continues
  to pass, confirmed by the maintainer.
- **SC-004**: At a desktop window width the top strip is visually
  indistinguishable from the pre-feature build — single-line readout, no
  elision, familiar positions — confirmed by the maintainer.
- **SC-005**: For any two readout contents needing different heights at the same
  viewport, the mute control's box and the theme picker's box are identical,
  asserted by a node test.
- **SC-006**: Placement is one pass and there is no second one: re-running the
  rule on its own output returns an identical arrangement for the grown,
  ungrown, expanded, and collapsed cases across the whole pinned viewport set,
  and an arrangement computed from a deliberately wrong achieved band height is
  identical to one computed from the correct height — asserted by a node test,
  so there is no height-feeds-width dependency left to flicker.
- **SC-007**: A deliberate regression that pins an occupant's placed height to
  its unwrapped natural height fails the suite at 360 px and 320 px on a runner
  with no browser.
- **SC-008**: Every test that passed before this feature still passes unchanged,
  including all of 012's, and `dist/` still holds exactly one self-contained
  `index.html`.
- **SC-009**: With a deliberately over-long theme display name registered, the
  collapsed control's label renders entirely inside its own box at 320 px, with
  zero pixels outside — demonstrated by the test's parameterization over
  occupant sizes, not by shipping such a theme.
- **SC-010**: `docs/manual-verification.md`'s "Standing checks" section carries
  the content-containment item alongside the 012 overlap item, and spec 012's
  Maintainer Review Notes are byte-for-byte unchanged.

## Maintainer Review Notes

CI has no browser, so what a real screen looks like is verified by hand at
review time, per Principle VII. With the game running from `dist/index.html`
opened via `file://`:

**On the narrowest real device to hand, and at emulated 320 and 360 px:**

1. Start a cave and read the whole readout — diamonds of quota, time, score,
   lives. Every character sits on the dark readout background; nothing trails
   onto the cave. This is the reported defect; if anything spills, it spills
   here.
2. Play into a five-digit score and watch the readout as it grows. It gets
   taller if it needs to; it never leaks.
3. Confirm the mute control and the theme control have not moved compared with
   the same device before this change, and that they are still whole, separate,
   and tappable.
4. Look at the title screen — the longest readout line in the game — and confirm
   it is inside its box too.

**On a real phone, both orientations:**

5. Rotate mid-cave. Confirm the readout re-fits in the new orientation, that no
   occupant has landed under a thumb margin, and that the strip settles once —
   no visible flicker between a tall and a short band.
6. Confirm the whole 012 standing check still passes: nothing in the strip
   overlaps anything else in it or the touch controls.

**On a desktop window:**

7. Confirm the top strip is exactly as it was before this feature — one line, no
   ellipsis — and resize slowly from wide to narrow. The readout should grow and
   the picker should collapse without flicker at the widths where each happens.

**In the diff:**

8. Confirm no file under `src/sim/` changed, no theme id appears in placement or
   rendering code, and no viewport width is hard-coded outside the tests.
9. Confirm `docs/manual-verification.md`'s existing "Standing checks" section
   gained the content-containment item and that spec 012's spec file is
   untouched.

## Assumptions

- **This is 012's gap, not 012's regression**: spec 012's requirements are
  correct and its tests keep passing. This feature adds a property none of them
  covered — that a box is sized for the content it will hold — rather than
  changing where any box goes at a width where nothing is capped.
- **Growth covers more cave; it does not shrink it**: 012's assumption that the
  strip's occupants stay overlays is kept. A taller readout at 320 px covers a
  little more of the cave than it does today, and covers nothing more at
  desktop widths. Reserving vertical space and shrinking the play area remains
  out of scope and would change what every cave looks like on every device.
- **Text measurement belongs to the shell**: how tall a string is at a given
  width depends on the font the browser actually used, so it is measured at
  runtime and handed to the rule as numbers. The rule stays free of the DOM,
  which is what keeps it testable without a browser, per Principle VII.
- **Elision is the floor, not the plan**: the expected outcome at every supported
  width is that the readout fits by growing. Elision exists so that FR-001 can
  be absolute even in the cases nobody predicted — a degenerate viewport, a font
  substitution, a measurement taken too early.
- **The values shown are not narrowed by this feature**: which values the readout
  displays on which screen is 005's business, unchanged here. Fitting is
  achieved by sizing and, at the floor, by elision — not by deciding that lives
  matter less than score on a small phone.
- **The status banner and the touch controls are out of scope**, as in 012: the
  banner is centered, transient, and not a strip occupant; the touch controls
  have their own layout and their own tests.
- **Bindings and behavior are untouched**: the mute key, the cycle-theme key,
  every gamepad binding, and everything these controls do stay exactly as they
  are. This feature changes how big their boxes are, not what they do.
- **No new dependency, no browser test harness**: the properties are asserted
  over a pure function in the existing suite, in keeping with Principle VII's
  prohibition on browser-automation test infrastructure.
- **Nothing leaves the device**: this feature adds no network use and no new
  persisted value.
