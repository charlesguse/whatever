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

**Item 13 note.** Does not require reaching cave 8. The renderer fits cave
width to the canvas and lets height overflow, so a short, wide browser window
scrolls vertically on any cave, including cave 1. Cave 8 (26x16) is the only
cave that scrolls *horizontally*, against the 24-column `TARGET_VISIBLE_CELLS`
target; caves 3, 4, 7, and 8 scroll vertically on their own in a typical 16:9
window.

---

## 007 — Touch controls and gamepad support

Checklist: `specs/007-touch-gamepad-input/quickstart.md`. **Not yet run.**
Gamepad items are parked until the controller is found; touch and landscape
items need a touchscreen or emulation.

## 006 — Classic theme and an in-game theme switcher

Checklist: `specs/006-classic-theme-switcher/quickstart.md`, "Validate
`file://` playback" (17 items). **Not yet run.**

## 005 — Arcade shell: eight caves, timer, score, lives, and game over

Checklist: `specs/005-arcade-shell-caves/quickstart.md` (13 items). **Not yet
run.**

## 004 — Amoeba, magic wall, and expanding wall

Quickstart items 1-8. **Not yet run.**

## 001 — Foundation

T031 deferred at spec time. **Not yet run.**
