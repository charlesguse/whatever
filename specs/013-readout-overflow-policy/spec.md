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
regions) still hold, and that re-running the rule on its own output converges to
the same arrangement.

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
   from the same measurements, **Then** it returns the same arrangement — the
   readout's height feeding back into the layout cannot make the strip oscillate
   between a tall and a short state.
6. **Given** a grown readout, **When** the theme picker's collapse decision is
   made, **Then** it is still made from natural (unwrapped) sizes as 012 FR-012a
   requires — a readout that wraps must not change whether the picker collapses.
7. **Given** a resize or rotation, **When** the strip is recomputed, **Then**
   it settles within a bounded number of measurement passes, and not once per
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
  in effect**: placement is a function of the latest measurement only, and
  settles within a bounded number of passes rather than chasing itself.
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
  box's height**. [NEEDS CLARIFICATION: is one third of the available height the
  right ceiling for how much of a small screen the readout may claim — at 320 px
  the text needs about 80 px, which is well inside it, but a future longer
  readout could take much more?]
- **FR-010**: When an occupant's content cannot fit even at the FR-009 bound,
  the content MUST be reduced to fit — elided with a visible indication that it
  is truncated — while FR-001 continues to hold. The box never yields, and the
  arrangement never yields; only the amount of text shown yields.
- **FR-011**: The policy for a capped occupant MUST be **grow the box to fit the
  content, then elide what still does not fit**, applied uniformly to every
  occupant the rule places smaller than its natural size. It MUST NOT be
  configured per occupant, per theme, or per screen. [NEEDS CLARIFICATION: is
  grow-then-elide the policy the maintainer wants? The alternatives named in the
  issue are (a) keep the readout one line and ellipsize it, which loses values
  at 320 px, and (b) leave the band's height alone and clip, which hides text
  with no indication. A fourth option — theme-provided short-form readout labels
  for narrow screens — would keep every value visible on one line but adds a
  field to the theme contract.]
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
- **FR-016**: Recomputation MUST remain idempotent (012 FR-018): feeding the
  rule an unchanged screen and unchanged content MUST yield an unchanged
  arrangement. Because an occupant's height now depends on the width the rule
  gave it, and the rule's caps depend on heights, the shell MUST settle this in
  a **bounded** number of measurement passes per resize, orientation change, or
  content change — with a stated maximum, no unbounded loop, and no
  recomputation per frame or per simulation tick.
- **FR-017**: At viewport sizes where nothing is capped, the rendered result MUST
  be byte-for-byte the arrangement that ships today: a single-line readout, the
  familiar leading/centre/trailing positions (012 FR-020), no wrapping and no
  elision.
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
  and FR-016's bounded settling.
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
  regions. Zero when there is no room to grow.
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
  confirmed by the maintainer on a real device or a device-emulated width, and
  measured as 18 px and 36 px of spill today.
- **SC-003**: At 412 px the rendered result is unchanged from the current build:
  a two-line readout with its text inside the band. Spec 012's SC-002 continues
  to pass, confirmed by the maintainer.
- **SC-004**: At a desktop window width the top strip is visually
  indistinguishable from the pre-feature build — single-line readout, no
  elision, familiar positions — confirmed by the maintainer.
- **SC-005**: For any two readout contents needing different heights at the same
  viewport, the mute control's box and the theme picker's box are identical,
  asserted by a node test.
- **SC-006**: Re-running the rule on its own output returns an identical
  arrangement for the grown, ungrown, expanded, and collapsed cases across the
  whole pinned viewport set, and the shell settles each reflow within its stated
  maximum number of measurement passes — asserted by a node test, so a
  height-feeds-width dependency cannot flicker.
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
