# Quickstart: Taps Never Hide The Touch Controls

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for entity shapes and
[contracts/visibility-api.md](./contracts/visibility-api.md) for the changed
module surface. This extends feature 007's quickstart — everything it
validates about touch geometry, gamepad, and the capability/last-input gate's
existing table still applies unchanged (FR-010: "the existing 007 visibility
assertions MUST continue to pass"). This feature adds one new automated check
and one new standing manual check.

## Prerequisites

- `npm install` at the repo root (unchanged from earlier features)

## Validate the decision table in isolation (no browser)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, touchscreen, or pointer device present. Confirms, per
`contracts/visibility-api.md`:

- `nextLastInputSource` resolves `'touch'` and `'pen'` origins to `'touch'`
  and `'mouse'`/`'keyboard'` origins to `'discrete'`, as two calls with
  different arguments producing opposite results (FR-006, SC-004);
- an `'unknown'`-origin call is a no-op regardless of `current` (FR-004);
- `shouldShowTouchControls`'s existing capability × `lastInputSource` table
  (007) still holds unmodified (FR-010).

**To confirm SC-004 concretely** (the suite fails if the fix is reverted):
temporarily revert `nextLastInputSource` to route `'unknown'` (or all
origins) through the old `eventType`-based `'click'` → `'discrete'` behavior
and re-run `npm test` — the new tap-synthesized-activation row should fail.
Revert the temporary change afterward; this is a spot-check, not a permanent
test-of-a-test.

## What CI cannot validate

Nothing here exercises a real `pointerdown`/`click` sequence from an actual
touchscreen — CI has no browser (Principle VII) and this feature explicitly
does not add browser-automation test infrastructure (Out of Scope). The
below is the maintainer's manual pass, mirrored into
[`docs/manual-verification.md`](../../docs/manual-verification.md)'s new
"Standing checks" section (FR-012, FR-012a) as a re-runnable item, not a
one-time entry tied to this feature.

### On a real touch-only device (no keyboard, no mouse)

- Tap each pad zone at least five times; the kid moves and the controls
  never disappear.
- Tap grab, pause, restart, the theme picker, and the mute button; the
  controls are still present after each.
- Tap rapidly, twenty or so times, all over the page; no flicker.
- Play a cave to completion with thumbs only; no reload needed.
- If a stylus is available, repeat the pad/button taps with it.

Emulated touch in desktop devtools does **not** reproduce the original
defect faithfully (its synthesized-click behavior differs) — this pass
requires real hardware. See spec.md's Maintainer Review Notes for the full
checklist this mirrors.

### On a touchscreen laptop (touch and keyboard)

- Controls visible before any input; vanish on a key press; vanish on a real
  mouse click; return on a touch — each instantly.
- Tab to an on-screen button, activate with Enter/Space: controls hide
  (FR-004a).
- Move the mouse/trackpad without clicking, in both visibility states: no
  change.
- Alternate touch, keyboard, and mouse through a whole cave: no stale state.

### On a plain desktop (neither touch nor mouse-as-primary is unusual here — just confirm nothing regresses)

- No on-screen control ever appears; no console error.
- Diff touches no file under `src/sim/`, no keyboard binding, no touch
  layout/action mapping (FR-011).
- `docs/manual-verification.md` has a "Standing checks" section holding this
  item, separate from the dated per-spec log, and `specs/007-*` is untouched
  (FR-012, FR-012a, FR-012b).
