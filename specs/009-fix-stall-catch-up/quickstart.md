# Quickstart: Drop The Tick Backlog On A Stall

How to validate this feature end-to-end once implemented. See
[data-model.md](./data-model.md) for the pending-time/stall/boundary shapes
and [contracts/stall-rule-api.md](./contracts/stall-rule-api.md) for the new
`src/lib/loop/stall.ts` module surface. This is a defect fix against feature
008 — its quickstart's checks (single-file build, sim physics, arcade
shell, themes, input, sound derivation/voice-cap/mute/theme sound tables)
all still apply unchanged, and this feature adds exactly one new check to
that list plus the manual restore pass the issue was filed against.

## Prerequisites

- `npm install` at the repo root (unchanged from features 001–008)

## Validate the stall rule in isolation (no browser, no audio device)

```bash
npm test
```

**Expected outcome**: builds first, then the full `vitest` suite passes with
no browser, canvas, or `AudioContext` present, covering — per the spec's
Independent Tests — every case below.

**The rule itself (User Story 1 / User Story 3):**

- a normally paced frame's pending time is returned unchanged (FR-006, spec
  Acceptance Scenario US2-1);
- a stutter at or under the two-tick-interval boundary still carries its
  full pending time and later spends the ticks it owes (FR-006, US2-2);
- pending time landing exactly on the boundary is carried in full and
  spends two ticks, not one (FR-002, FR-017 — the boundary-itself case is
  asserted explicitly, not inferred);
- pending time one unit past the boundary drops to zero (FR-001, FR-005);
- a three-second-equivalent gap and a three-minute-equivalent gap both drop
  to the same zero — the number of ticks after a stall does not grow with
  the stall's length (FR-005, SC-003);
- a zero gap, a negative gap (clock running backward), and a non-finite gap
  (`NaN`, `Infinity`) all produce a finite, non-negative result and never
  drive a negative or unbounded tick count (FR-007, US3's Independent
  Test).

**Everything this feature must NOT change (User Story 2), asserted by the
existing suites passing untouched (SC-005):**

- every sim grid test under `tests/sim/**`;
- every feature 008 sound-derivation test (`tests/lib/audio/events.test.ts`)
  and voice-cap test (`tests/lib/audio/priority.test.ts`);
- the mute state machine and audio-availability tests
  (`tests/lib/audio/mute.test.ts`, `tests/lib/audio/availability.test.ts`);
- every theme sound table.

**Build integrity (SC-008):**

`npm test` builds `dist/` before running the suite; part of that suite
asserts `dist/` holds exactly one self-contained `index.html` with no new
runtime dependency (FR-006 of the spec's numbered success criteria list,
i.e. US2 Acceptance Scenario 6).

## Validate the restore itself (maintainer, by hand, `file://`)

CI has no browser (Constitution Principle VII), so the actual audible/
visible restore is confirmed at review time against a built
`dist/index.html` opened via `file://`. This is spec 009's version of
feature 008's listening-checklist item 11, re-run against this build per
FR-019:

1. **Backgrounded tab on the tally** — complete a cave so the bonus-tally
   screen is counting, switch to another tab for a few seconds, switch
   back. Expected: the tally resumes one step at a time from exactly where
   it stopped; no blip, no chord of stacked tally voices (SC-001).
2. **Backgrounded tab mid-collapse** — start a five-boulder collapse,
   switch away immediately, switch back. Expected: no stacked fall/
   explosion voices; the collapse resumes and finishes at its normal pace
   (SC-004) — this is the check that the fix is not scoped to the tally
   screen.
3. **Nothing lurches on any screen** — repeat the hide/restore on title,
   cave intro, playing, paused, life lost, game over, and won. Expected:
   the same behavior on every screen, never special-cased.
4. **Sleep and wake** — close the laptop lid mid-cave, reopen it. Expected:
   identical behavior to the hidden-tab case, with no page-visibility
   handler involved in producing it (FR-003).
5. **Focus without hiding** — click another window while the game stays
   visible. Expected: the game keeps running exactly as feature 005
   requires; no backlog accumulates, nothing freezes, nothing is dropped
   (FR-012).
6. **Ordinary play is untouched** — play a full cave with sound on.
   Expected: every fall, land, chime, blast, and low-time beep is where it
   was and at the pace it was (FR-009, FR-010).
7. **Muted and silent platforms** — repeat the hide/restore muted, and
   again with audio unavailable. Expected: the visible resume is identical
   either way (Edge Cases: "Audio unavailable or muted").
8. **Nothing surfaces to the player** — across every check above, confirm
   no console error, no warning, no on-screen banner appears (FR-015,
   SC-009).

## What "done" looks like

- `npm test` is green (build + full vitest suite, including the new
  `tests/lib/loop/stall.test.ts`).
- `git diff` touches only: `src/lib/loop/stall.ts` (new),
  `tests/lib/loop/stall.test.ts` (new), and `src/App.svelte` (the
  `tickLoop` call site plus removal of `MAX_ACCUMULATED_MS`) — no file under
  `src/sim/**` changes (FR-013), no theme file changes, no sound-derivation
  or voice-cap file changes (FR-009, FR-010).
- The maintainer has re-run listening-checklist item 11 against this build
  and it passes (FR-019, SC-001).
