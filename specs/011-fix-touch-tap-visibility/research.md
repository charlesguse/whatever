# Phase 0 Research: Taps Never Hide The Touch Controls

## Decision 1: Origin comes from `PointerEvent.pointerType`, not from `click`

**Decision**: Stop treating the window-level `click` listener as authoritative
for `lastInputSource`. Add a window-level `pointerdown` listener and classify
its origin from `event.pointerType` (`'mouse' | 'touch' | 'pen'`, mapped 1:1
to an `InputOrigin`; any other/absent value maps to `'unknown'`). `keydown`
continues to classify as `'keyboard'`. `click` is reclassified as
`'unknown'` — its own arrival no longer carries information the game trusts,
because by the time it fires, `pointerdown` (for a real pointer) or `keydown`
(for a keyboard activation) has already classified the interaction correctly.

**Rationale**: The reported defect exists because a single DOM event type
(`click`) is fired by three unrelated sources — a real mouse click, a
browser-synthesized click that follows every tap, and a keyboard Enter/Space
activation — and today's code cannot tell them apart because it never looks
past the event's type. `PointerEvent.pointerType` is the platform's own
answer to "what produced this pointer interaction," available on every
browser this project targets (Chrome, Firefox, Safari — all have shipped the
Pointer Events spec since well before this project's baseline), and reading
it is a capability read, not a UA/device sniff (007 FR-029, this feature's
FR-008). `pointerdown` also fires strictly before the synthesized `click` for
every input type, including touch, so classifying origin there and making
`click` inert closes the bug structurally: there is no longer a code path
where a synthesized click can flip `lastInputSource` back to `'discrete'`,
regardless of which element it lands on or whether that element cancelled the
click's default action (Edge Cases: "a tap whose synthesized click is
suppressed").

For a genuine mouse click, classifying on `pointerdown` instead of waiting
for `click` also satisfies FR-002 ("hide instantly") strictly — the controls
now hide on mouse-down rather than mouse-up, which is at least as fast and
never perceptibly different to a player.

For a keyboard-activated button (Enter/Space), the browser fires `keydown`
before the resulting `click`; no `pointerdown` occurs at all for that path.
`keydown` already classifies as `'keyboard'` → `'discrete'`, so the `click`
that follows has nothing left to do — this is FR-004a's requirement made
structural: "the key press... marks the last input source before the
resulting activation arrives," and the click handler is not asked to guess.

**Alternatives considered**:
- *Debounce/suppress a click that follows a touch within N ms.* Rejected —
  FR-007 explicitly forbids timing heuristics, and 007's FR-030 already
  forbids wall-clock reads in the decision. A timing window is also exactly
  the kind of thing that looks fixed until a slow device or a long-press
  changes the gap.
- *Read `event.sourceCapabilities` or `event.detail` on the `click` event
  itself.* Rejected — `MouseEvent.sourceCapabilities.firesTouchEvents` is a
  Chrome-only, non-standard signal with no equivalent on Safari/Firefox;
  relying on it would silently regress to today's bug on other browsers,
  which is worse than the current uniform-but-wrong behavior.
- *Keep `touchstart` as the only new signal and leave `click` authoritative
  for mouse.* Rejected — this is close to today's code and does not fix the
  bug: the synthesized `click` still arrives after `touchstart` on a tap and
  would still flip the state back to `'discrete'` under the old reducer's
  `click` branch.
- *Drop the `click` listener entirely instead of reclassifying it as
  `'unknown'`.* Rejected in favor of keeping it (still wired for
  `audioEngine.unlock('click')`, unrelated to this feature) but making it a
  no-op for visibility — this keeps a real call site exercising the
  `'unknown'` origin end-to-end rather than that branch being reachable only
  from tests, and it directly demonstrates FR-006's "origin is a declared
  input, not a caller convention": the click handler explicitly says "I
  don't know what produced this," and the decision function is the thing
  that decides that's safe.

## Decision 2: `'unknown'` origin leaves `lastInputSource` unchanged (no-op)

**Decision**: `nextLastInputSource(current, 'unknown')` returns `current`
unchanged, rather than forcing some fixed state.

**Rationale**: FR-004 requires that an activation whose origin cannot be
determined must not hide the controls — it does not require that it show
them either if they are already hidden for an unrelated, correctly-classified
reason. A no-op satisfies this for both starting states: if currently
`'touch'` or `'none'` (visible), an unknown-origin activation leaves it
visible; if currently `'discrete'` (hidden because of a real, classified
keyboard/mouse input), an unknown-origin activation does not newly hide
anything that wasn't already hidden, and does not spuriously show a keyboard
user's hidden controls either — which would be surprising in the other
direction. This also keeps the reducer a total, side-effect-free function of
its two arguments with no hidden preference for one visibility state over the
other.

**Alternatives considered**:
- *Force `'unknown'` to `'touch'` (always show).* Rejected — this would mean
  every stray `click` on a keyboard-driven touchscreen laptop reshows the
  controls, which is not what FR-002/User Story 2 wants and is not what the
  spec's Edge Cases describe (they describe unknown-origin as "costs at worst
  an untidy extra pad," implying it is not the common case being optimized
  for, and that the no-op reading — "don't newly break anything" — is the
  intended one).

## Decision 3: Pen (`pointerType === 'pen'`) maps to the same bucket as touch

**Decision**: `InputOrigin` values `'touch'` and `'pen'` both drive
`lastInputSource` to `'touch'` (visible). They are kept as distinct
`InputOrigin` values (not collapsed into one at the type level) so the
decision table can assert them as separate rows per FR-010, but they resolve
identically.

**Rationale**: FR-005 is explicit that a pen is direct manipulation of the
same screen the on-screen pad lives on, so it must be treated as touch-like.
Keeping them distinct at the type level (rather than mapping `pointerType
==='pen'` to the literal string `'touch'` at the classification site) keeps
the origin type an honest reflection of what `pointerType` can actually
report, and keeps FR-010's "a row for a pen activation" a real, distinct test
row rather than a row that's structurally identical to the touch row before
the assertion even runs.

## Decision 4: keep the `touchstart` listener as a fallback, additive to `pointerdown`

**Decision**: The existing window-level `touchstart` listener stays, still
classifying as `'touch'`, alongside the new `pointerdown` listener. Both are
wired; both can fire for the same physical tap (bubbling `pointerdown` then
bubbling `touchstart`), and both resolve to `'touch'`, which is idempotent
against the reducer's no-op-on-repeat behavior (already asserted by the 007
suite: `nextLastInputSource('touch', 'touchstart') === 'touch'`).

**Rationale**: `pointerdown` classification is sufficient by itself on every
browser this project's baseline supports, but keeping `touchstart` too is a
one-line-diff safety net with no behavioral cost (two calls that agree are no
different from one), and it avoids relitigating 007's existing, already-
tested `touchstart` → `'touch'` wiring for no reason. FR-011 asks the diff to
be no larger than it needs to be, but removing a working, tested listener
is not "smaller," it's a needless behavior change to a path this feature is
not fixing.

**Alternatives considered**:
- *Replace `touchstart` with `pointerdown` entirely.* Rejected — no
  behavioral benefit, and it changes a call site (touch classification) this
  feature's Assumptions section does not ask it to touch, for a codebase
  where "later specs MUST NOT regress earlier ones" applies to behavior, not
  just to tests.

## Decision 5: the reducer's second parameter changes from `eventType` to `origin`

**Decision**: `nextLastInputSource`'s signature changes from
`(current: LastInputSource, eventType: 'keydown' | 'click' | 'touchstart')`
to `(current: LastInputSource, origin: InputOrigin)`, where `InputOrigin =
'touch' | 'mouse' | 'keyboard' | 'pen' | 'unknown'`. `shouldShowTouchControls`
is unchanged (`(capabilities, lastInputSource) => boolean`) — origin is
consumed entirely by the reducer that produces `lastInputSource`; the
capability × last-input decision downstream of it does not need to see
origin a second time.

**Rationale**: This is what makes FR-006 concrete: "the origin of an
activation is one of its declared inputs rather than something a caller is
trusted to have classified correctly." Before this change, a caller decided
which of three fixed `eventType` strings to pass, and the *meaning* of
`'click'` (mouse? synthesized? keyboard-triggered?) was exactly the
convention this feature exists to remove. After this change, the caller's
only job is to report what the browser told it (a `pointerType`, or that it
was a `keydown`, or that it doesn't know), and the reducer alone decides what
that implies for visibility — `nextLastInputSource(x, 'touch')` and
`nextLastInputSource(x, 'mouse')` are now two calls with different arguments
that produce opposite results, which is FR-006's acceptance test read
literally.

`shouldShowTouchControls` does not need origin because `lastInputSource`
(`'none' | 'discrete' | 'touch'`) is already the complete summary of "what
matters about the last input" that the capability gate needs — adding origin
as a second, redundant input to that function would let it see information
it has no rule for, which is a smell this codebase's existing table-driven
tests (SC-011b) were designed to catch by exhaustion.

## Decision 6: FR-004a is structural, requires no new code path

**Decision**: No special-case branch for "click preceded by a key press" is
added anywhere. FR-004a falls out for free from Decisions 1 and 5: `keydown`
already sets `lastInputSource = 'discrete'` before the resulting `click`
fires, and the `click` handler now classifies as `'unknown'`, which is a
no-op per Decision 2. The `'discrete'` state set by the key press survives
the click untouched.

**Rationale**: This is exactly the "closes it structurally" framing in the
spec's Context section — no code needs to know that a particular `click` was
"the kind that follows Enter/Space." It only needs to not be fooled by any
`click`, ever, which Decision 1 already guarantees for every source of
`click`, not just this one.

## Summary of the new decision table (feeds FR-010's test rows)

| origin | `nextLastInputSource(_, origin)` regardless of `current` (except `'unknown'`, a no-op) |
|---|---|
| `'touch'` | `'touch'` |
| `'pen'` | `'touch'` |
| `'keyboard'` | `'discrete'` |
| `'mouse'` | `'discrete'` |
| `'unknown'` | `current` (no-op) |

Composed with `shouldShowTouchControls({ hasTouch: true }, ...)`: `'touch'`
and `'pen'` origins → visible; `'keyboard'` and `'mouse'` origins → hidden;
`'unknown'` → unchanged (visible unless something else already hid it).
This is the FR-010 table: a tap-synthesized activation (origin `'touch'` from
its `pointerdown`, origin `'unknown'` from its trailing `click`) leaves the
controls visible; a genuine mouse activation (origin `'mouse'` from its
`pointerdown`) hides them.
