# Manual verification log

CI has no browser, canvas, audio device, touchscreen, or controller, so every
spec ships a checklist the maintainer works through by hand (constitution,
Principle VII: "Feel, timing, and visuals are the maintainer's job at review
time; specs state what to eyeball"). This file records what has actually been
checked, when, and against which build — so a checklist item is never assumed
passed just because its feature merged.

One section per spec. Each item is `pass`, `fail` (with the issue it became),
or `blocked` (with what it is waiting on). An item with no entry has not been
run.

---

## Standing checks

Unlike the dated per-spec sections below, these are re-runnable items with no
single "done" date — re-run each one against any change that touches the area
it covers, not just once at the owning spec's review.

### Touch-only tap visibility (011, `#31`)

On a real touch-only device — no keyboard, no mouse — tap the movement pad,
grab, pause, restart, the theme picker, and the mute button repeatedly, and
confirm the on-screen touch controls never disappear. Emulated touch in
desktop devtools does not reproduce the defect this guards against (a tap's
browser-synthesized `click` being mistaken for a real mouse click); a real
device is required.

**Run 2026-09-03, by the maintainer, on the Pixel 10 Pro against main at
`b43cae8`: pass** — reported as "the pixel controls work well now". This is the
first on-device run since 011 merged (`e0c5a48`), on the same device and the
same no-keyboard situation that originally surfaced #31 during 007's pass.

### Top-strip controls never overlap (012, `#35`)

On a real phone, in both portrait and landscape, confirm the status readout,
the mute control, and the theme picker (expanded or collapsed) never overlap
each other or the on-screen touch controls, and that each is fully legible
and tappable. Re-run against any change that touches `src/App.svelte`'s
top-strip markup/CSS or `src/lib/layout/topStrip.ts`, not just once at this
spec's review.

**Run 2026-09-03, by the maintainer, on the Pixel 10 Pro against main at
`b43cae8`: pass**, reported together with the touch-control check above. The
report was that the controls work; it did not itemise the sub-checks, so the
following are **not** covered by it and remain to be run: landscape (the report
does not say which orientation was used), rotation mid-cave with a thumb down
(also 007's outstanding item), and repeated taps on the collapsed theme control
reaching every theme in turn. The readout's sub-380px wrap (#43) is out of
scope of this device: at the Pixel's 412px the band is already sized for two
lines and nothing spills.

### Top-strip content never renders outside its box (013, `#43`)

On the narrowest real device to hand, in both portrait and landscape, confirm
that the status readout, the mute control, and the theme picker (expanded or
collapsed) never render any part of their text or content outside their own
dark background — no white text directly on the cave, at any width down to
320 CSS px. Re-run against any change that touches `src/App.svelte`'s
top-strip markup/CSS or `src/lib/layout/topStrip.ts`, not just once at this
spec's review.

---

## 008 — Synthesized sound, per theme, always mutable

Checklist: `specs/008-synthesized-sound/spec.md`, "What the maintainer listens
for" (13 items).

**Run 2026-09-02, by the maintainer, against `dist/index.html` built from
`bf9d316` — desktop browser, `file://`.**

| # | Item | Result |
| --- | --- | --- |
| 1 | Dirt step | pass |
| 2 | Fall start / land (single, then a stack) | pass |
| 3 | Diamond collected | pass |
| 4 | Exit opening | pass |
| 5 | Explosion | pass |
| 6 | Low time | pass |
| 7 | Bonus tally | pass |
| 8 | Mute (instant, persists, unmute) | pass |
| 9 | Theme switch mid-cave | pass |
| 10 | iOS Safari first-tap unlock | blocked — needs an iOS device |
| 11 | Backgrounded tab | **fail** — [#26](https://github.com/charlesguse/whatever/issues/26) |
| 12 | Controller only | blocked — needs the controller |
| 13 | Off-camera events | pass |

**Item 11 detail.** Returning to a backgrounded tab on the bonus-tally screen
produced a short loud blip — several tally voices at one instant. The tick
loop's catch-up clamp (`App.svelte:50`) bounds the backlog at five ticks but
does not drop it, so five `stepTick()` calls run inside a single frame and
schedule five voices at the same `context.currentTime`. The tally screen is
where it is audible because it is the only screen that emits a sound on every
tick, but the mechanism is general — it will stack fall and explosion voices
if the tab is hidden mid-collapse. This violates 008's own acceptance scenario
6 ("no accumulated sounds fire at once"), which had been taken as satisfied by
005's clamp. Filed as #26.

**Fixed by spec 009** (`a905ef5`, PR #37): the clamp is replaced by
`nextPendingTime` in `src/lib/loop/stall.ts`, which drops the backlog outright
when pending time exceeds two tick intervals, so the frame after a stall runs
no catch-up ticks at all. Item 11 is **awaiting re-run** against a build from
main at or after that commit, along with the mid-collapse variant that shows
the fix is not scoped to the tally screen.

**Item 13 note.** Does not require reaching cave 8. The renderer fits cave
width to the canvas and lets height overflow, so a short, wide browser window
scrolls vertically on any cave, including cave 1. Cave 8 (26x16) is the only
cave that scrolls *horizontally*, against the 24-column `TARGET_VISIBLE_CELLS`
target; caves 3, 4, 7, and 8 scroll vertically on their own in a typical 16:9
window.

---

## 007 — Touch controls and gamepad support

Checklist: `specs/007-touch-gamepad-input/spec.md`, **Maintainer Review Notes**
(007's quickstart defers to it rather than duplicating it). Grouped by device
situation rather than numbered.

**Partially run 2026-09-02, on a phone/tablet with no keyboard, against
`bf9d316`.**

Tablet/phone, in the order the notes list them:

| Item | Result |
| --- | --- |
| Full cave with two thumbs; pad and grab reachable | pass |
| Slide between pad zones; clean direction change, no diagonal | pass |
| Break the page: drag, flick, pinch, double-tap, long-press, edge swipe | pass |
| Rotate device mid-cave with a thumb down | not run — item was unclear, since clarified |
| Nothing hidden behind a control or thumb; cave still reads | pass |
| Tap a theme mid-cave; switches, controls do not eat the tap | pass |
| Finishable title-to-win without a keyboard | partial — works so far, game not yet completed |

**Found during this pass:** tapping the on-screen controls on a keyboard-less
device hides them — [#31](https://github.com/charlesguse/whatever/issues/31).
A tap's browser-synthesized `click` is treated as a mouse click, which flips
`lastInputSource` to `discrete` and fails `shouldShowTouchControls`. The pure
reducer in `visibility.ts` is correct; the call site feeds it a synthesized
click it cannot distinguish from a real one.

**Also found during this pass:** at phone width the HUD readout, the mute
button, and the theme picker overlap each other —
[#35](https://github.com/charlesguse/whatever/issues/35), reported on Chrome on
a Pixel 10 Pro. All three are `position: fixed` at `top: 0.5rem` — pinned left,
centred at `left: 50%`, and pinned right — with nothing measuring between them.
The mute button's own comment asserts it sits "clear of the HUD readout
(top-left), the theme picker (top-right)", which was true at the width it was
written at and is enforced nowhere. `themePickerRightPx` does position the
picker dynamically, but only to inset it from the cave's right edge in
landscape; in portrait the cave spans the full inset width, so it reduces to a
flat 8 px and the picker sits at the viewport edge exactly as it would with no
rule at all.

No test could have caught this. 007's non-overlap guarantee is enforced
structurally by `containRect` and pinned by `layout.test.ts`, but it covers the
*touch controls* only — these three occupants are plain CSS outside that layout
system, so nothing in the node suite can fail when they collide.

**Both defects from this pass share a cause with 008's SC-009 gap:** a
guarantee held by a comment or a CSS assumption rather than by one testable
function. Specs 011 and 012 each move their guarantee into a pure function with
node coverage, and 011 adds a standing checks section to this file so the
touch-only case is re-run against every touch-affecting change rather than once.

**Both are now confirmed fixed on the reporting device** — see the 2026-09-03
Pixel 10 Pro entries under Standing checks. 007's own outstanding items
(rotate mid-cave, controller, touchscreen laptop, title-to-win without a
keyboard) are unaffected by that run and still stand.

Desktop with a controller: **not run**, parked until the controller is found.

Touchscreen laptop (touch + keyboard): **not run**, deferred by the maintainer.

Plain desktop with neither:

| Item | Result |
| --- | --- |
| Page looks as it did before the feature, no console error, keyboard unchanged | pass |
| Diff touches no file under `src/sim/` (FR-033), changes no keyboard binding (FR-034) | pass — verified against the 007 finalize merge (`8532251`, PR #23): zero `src/sim/` changes, and `src/lib/input/keyboard.ts` is untouched by that diff |

## 006 — Classic theme and an in-game theme switcher

Checklist: `specs/006-classic-theme-switcher/quickstart.md`, "Validate
`file://` playback" (17 items).

**Run 2026-09-02 — items 1-12 and 14-16 by the maintainer against
`dist/index.html` at `bf9d316`; item 17 verified from the diff of the 006
finalize merge (`9e3c617`, PR #20).**

| # | Item | Result |
| --- | --- | --- |
| 1 | Build and open from disk | pass |
| 2 | Theme control listed, keyboard-operable | pass |
| 3 | Classic switches every element and string, no reload | pass |
| 4 | Classic's closed exit indistinguishable from steel wall | pass |
| 5 | Play under Classic identical to Classroom | pass |
| 6 | Switch mid-cave with a boulder in flight | pass |
| 7 | Switch while holding a movement key | pass |
| 8 | Cycle key from title does not start the game | pass |
| 9 | Cycle key mid-cave does not consume movement | pass |
| 10 | Switch on every non-playing screen | pass |
| 11 | Re-selecting the active theme is a no-op | pass |
| 12 | Classic survives reload with score and progress | pass |
| 13 | `localStorage` disabled for the page | blocked — needs devtools site-data block |
| 14 | Click/tap works in addition to keyboard | pass |
| 15 | Tab + Enter switches without starting a cave | pass |
| 16 | Frame rate holds through a switch | pass |
| 17 | Diff audit | pass — see below |

**Item 17 detail** (diff `9e3c617^..9e3c617`, PR #20):

- **Zero files under `src/sim/` changed.** Nothing in the diff touches the sim.
- **Zero comparisons against a theme id in rendering or shell logic.** The only
  occurrence of a theme id outside the two theme-data files is a comment in
  `src/lib/themes/index.ts` documenting registration order — not a branch.
- **Adding Classic touched only theme data and the registration entry point.**
  `src/lib/themes/classic.ts` (new, entirely data) plus a two-line registration
  in `src/lib/themes/index.ts`. `types.ts` gained a required `displayName` and
  `classroom.ts` filled it in — the contract gaining a field, which is the
  prescribed move in CLAUDE.md rather than a violation. Because `displayName`
  is required on `Theme`, a theme that omits it fails to compile.
- **The renderer was not touched at all** — zero changes under `src/lib/render/`.

The remaining changed files (`App.svelte`, `keyboard.ts`, `save.ts`,
`selection.ts`, `registry.ts`) are the switcher, which is 006's other half and
not part of what item 17 constrains.

## 005 — Arcade shell: eight caves, timer, score, lives, and game over

Checklist: `specs/005-arcade-shell-caves/quickstart.md` — 13 `file://` playback
items plus a three-bullet theme-contract diff audit.

**Run 2026-09-02, by the maintainer, against `bf9d316`.**

| # | Item | Result |
| --- | --- | --- |
| 1 | Build and open from disk | pass |
| 2 | Title screen badges; start key begins a new game | pass |
| 3 | HUD and cave intro | pass |
| 4 | Death costs one life, same cave reloads, feels instant | pass |
| 5 | Clock to zero: death with no explosion | pass |
| 6 | Bonus tally pacing, skip lands on same total | pass |
| 7 | Game over shows final score, returns to title | pass |
| 8 | Cave eight leads to the win screen, not a ninth cave | pass |
| 9 | Pause stops the clock; resume is exact | pass |
| 10 | Restart at five points (first three cost a life, last two do not) | pass |
| 11 | Reload preserves high score and furthest cave | not run — see note |
| 12 | Classroom voice throughout; no double screen skip on a held key | pass |
| 13 | Frame rate across all eight caves | partial — rock solid so far, run not yet completed |

**Item 11 note.** The maintainer asked when the high score is meant to appear.
It is written only on the transition into `gameOver` or `won`
(`App.svelte:166-168`) and displayed only on the **title screen**, and only when
greater than zero (`App.svelte:293`). So it is invisible until a run actually
ends and returns to the title, and a first-ever run shows nothing because the
stored value is still 0. Item 11 is therefore still to be run: finish a run,
return to title, note the score, reload, and confirm it survives. Its
`localStorage`-disabled half is blocked the same way 006's item 13 is.

The three-bullet theme-contract diff audit at the end of 005's quickstart has
**not** been run; it needs no browser and can be verified from the diff.

## 004 — Amoeba, magic wall, and expanding wall

Quickstart items 1-8. **Not yet run.**

## 001 — Foundation

T031 deferred at spec time. **Not yet run.**
