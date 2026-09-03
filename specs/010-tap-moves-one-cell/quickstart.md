# Quickstart: Validating One Tap, One Cell

## Prerequisites

- Node installed, repo dependencies installed (`npm install`).
- No browser needed for the automated checks below; a real device is only
  needed for the manual pass at the end (same as every other feature —
  Principle VII).

## Automated validation

```bash
npm test
```

This builds `dist/index.html` first (so the single-file-artifact check has
something real to inspect) and then runs the full `vitest` suite. For this
feature, that suite must demonstrate all of the following without touching
a browser:

1. **The shared rule, in isolation** (`tests/lib/input/repeat.test.ts`):
   `advanceRepeat` produces the table in
   `contracts/repeat-delay-api.md` — report on tick 1, suppress on tick 2,
   report on tick 3 and every tick after, reset to the initial state on
   release.
2. **Per-source tap/hold/release sweeps**
   (`tests/lib/input/keyboard.test.ts`,
   `tests/lib/input/touch/TouchInput.test.ts`,
   `tests/lib/input/gamepad/GamepadInput.test.ts`): for every tap length up
   to two observed ticks, and at every tick-boundary offset, exactly one
   move is reported (FR-001, SC-001); a sub-tick tap still reports exactly
   one move (FR-009); a direction held across many ticks settles into
   "report, skip, report, report, report, …" with no further gaps
   (FR-002, FR-003, SC-003, SC-004); releasing and re-pressing resets the
   count (FR-006); switching directions mid-hold takes effect immediately
   (FR-007).
3. **Cross-source parity** (`tests/lib/input/action-coverage.test.ts`):
   keyboard, touch, and gamepad all resolve their repeat cadence by calling
   the same imported `advanceRepeat`, not through independently-shaped
   per-source logic (FR-018, FR-019, US3).
4. **No regressions**: every test that passed before this feature still
   passes, except the two FR-020 names (`TouchInput.test.ts` and
   `GamepadInput.test.ts`'s "held direction repeats every tick" assertions,
   now updated to the new cadence) — FR-021, SC-007. Zero diffs under
   `tests/sim/` or `src/sim/` (SC-006).
5. **Single-file build intact**: `tests/build/single-file.test.ts` (already
   in the suite) still finds exactly one self-contained `dist/index.html`
   (SC-007).

## Manual validation (maintainer, at `dist/index.html` via `file://`)

Open `dist/index.html` directly from disk (no server) and work through
`spec.md`'s "What the maintainer checks by hand" list:

1. Tap an arrow key and a WASD key twenty times each at a natural pace —
   exactly one cell every time.
2. Line the kid up under a boulder overhang one cell at a time — possible
   on the first attempt.
3. Hold a direction across a long dirt corridor and judge the single
   125 ms hitch before it gets moving.
4. Hold left, then press right without releasing left — the kid turns
   immediately.
5. Alternate left/right taps rapidly — the kid tracks the taps exactly,
   never running on after the keys stop.
6. On a real tablet: tap the on-screen d-pad, then hold it — same cadence
   as keyboard; slide a thumb between zones and confirm it still
   re-acquires.
7. **Gamepad — deferred**, no hardware on hand for this feature; ships
   stated and unchecked (spec.md, item 7). The node-level parity assertion
   (point 3 above) still must pass before merge.
8. Hold a direction and switch away from the page/app — the kid stops, does
   not walk off on its own.
9. Pause mid-corridor with a direction held, resume — the walk continues
   without a stutter or a free extra step.

## Expected outcome

`npm test` is green, `dist/` holds exactly one `index.html`, and every item
above (other than the deferred gamepad hardware check) is confirmed by
hand. If the 125 ms hitch in item 3 feels worse in practice than it reads
on paper, that is a new issue to file, not a silent retune of
`REPEAT_DELAY_TICKS` (spec.md, "What the maintainer checks by hand").
