# Implementation Plan: Drop The Tick Backlog On A Stall

**Branch**: `009-fix-stall-catch-up` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-fix-stall-catch-up/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`App.svelte`'s fixed-timestep loop currently bounds its accumulator with
`Math.min(accumulator + elapsed, TICK_INTERVAL_MS * 5)` — a five-tick clamp
that still lets a restored frame run up to five catch-up ticks, each one
calling `audioEngine.play(...)` once, which is the burst the issue reports.
The fix replaces that clamp with a single pure, total function —
`nextPendingTime(pendingTime, elapsed, tickIntervalMs)` in a new module,
`src/lib/loop/stall.ts` — that carries pending time unchanged at or under two
tick intervals and drops it to zero above that boundary (a stall). `tickLoop`
calls this function in place of the old `Math.min` clamp; nothing else about
the loop, the sim, or sound derivation changes. The function is pinned by a
node-only vitest suite at `tests/lib/loop/stall.test.ts`, matching the
existing pure-function idiom (`src/lib/audio/mute.ts`, `src/lib/input/
visibility.ts`, `src/lib/audio/availability.ts`, `src/lib/input/merge.ts`).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes

**Primary Dependencies**: Svelte 5, Vite, vite-plugin-singlefile (no new
dependency added by this feature)

**Storage**: N/A — this feature adds no persisted state (per spec Assumptions)

**Testing**: vitest, `environment: 'node'`, tests under `tests/**/*.test.ts`
mirroring `src/**` paths (see `vite.config.ts`)

**Target Platform**: Browser via `file://`, no server; sim/shell logic itself
runs anywhere Node runs for tests

**Project Type**: Single-page web app (sim + Svelte shell in one repo, one
build target)

**Performance Goals**: Constitution Principle VI — steady frame rate (60fps
target, 30fps floor); the tick loop stays a fixed-timestep loop decoupled
from rendering; FR-014 requires the new rule allocate nothing per frame or
per tick

**Constraints**: FR-016/FR-018 — the rule must be a pure, total, importable
function verifiable with a plain node test, no browser automation, no DOM/
canvas/audio device required to verify it

**Scale/Scope**: One new pure-function module (~10-15 lines), one call-site
change in `App.svelte`'s `tickLoop`, one deleted constant
(`MAX_ACCUMULATED_MS`), one new test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (One Self-Contained Page)**: PASS. No new dependency, no new
  network access, no change to the build. `dist/index.html` stays a single
  file (FR-006 of spec's success criteria list, SC-008).
- **Principle II (Deterministic, Tick-Based Sim)**: PASS. FR-013 forbids any
  sim change; this feature only touches the shell's frame-to-tick conversion
  in `App.svelte`. `src/sim/**` is untouched, verified by SC-005 (all
  existing sim grid tests pass unchanged).
- **Principle III (Themes Are Data)**: PASS. No theme file touched, no new
  theme field needed — the fix is about tick counting, not sound content.
- **Principle IV (Simple, Dependency-Light Svelte)**: PASS. The new module
  lives in `src/lib/loop/`, a plain TypeScript file with no Svelte import,
  matching the existing separation between sim/shell-pure-logic and the
  Svelte component that calls it.
- **Principle V (Input Is Keyboard-First, Progressive)**: N/A — unaffected.
- **Principle VI (Performance Is A Feature)**: PASS. The replacement function
  is arithmetic over three numbers — no allocation, no object creation,
  called once per frame exactly as the code it replaces was. The loop
  remains fixed-timestep and decoupled from rendering (FR-014).
- **Principle VII (Verifiable Without A Browser Harness)**: PASS — this is
  the shape the spec explicitly asks for: a pure, total function with a
  node-only vitest suite (FR-016, FR-017, FR-018), no browser-automation
  infrastructure added.

No violations. Complexity Tracking is not needed for this feature.

*Post-Phase-1 re-check*: unchanged — the design in Phase 1 below stays
inside a single new pure-function module plus a one-call-site edit in
`App.svelte`; no gate is affected by the added detail.

## Project Structure

### Documentation (this feature)

```text
specs/009-fix-stall-catch-up/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── stall-rule-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── sim/                  # unchanged by this feature (Principle II, FR-013)
│   ├── cave.ts            # TICK_RATE_HZ — the single source of truth for tick rate
│   └── ...
├── lib/
│   ├── loop/               # NEW — this feature's only new directory
│   │   └── stall.ts         # nextPendingTime(pendingTime, elapsed, tickIntervalMs)
│   ├── audio/               # unchanged (events.ts, priority.ts, engine.ts, mute.ts, availability.ts)
│   ├── input/                # unchanged (merge.ts, visibility.ts, keyboard.ts, ...)
│   ├── session/              # unchanged
│   ├── render/                # unchanged
│   ├── storage/               # unchanged
│   └── themes/                 # unchanged
├── App.svelte              # tickLoop() edited: MAX_ACCUMULATED_MS clamp
│                            # replaced by a call to nextPendingTime()
└── caves/                  # unchanged

tests/
├── lib/
│   ├── loop/                # NEW
│   │   └── stall.test.ts     # node-only vitest suite, mirrors src/lib/loop/stall.ts
│   ├── audio/                # unchanged, asserted still green (SC-005)
│   ├── input/                 # unchanged, asserted still green (SC-005)
│   └── ...
└── sim/                      # unchanged, asserted still green (SC-005)
```

**Structure Decision**: Single project, existing layout. This feature adds
exactly one new directory, `src/lib/loop/` (mirrored at `tests/lib/loop/`),
following the one-concern-per-file convention already used by
`src/lib/audio/mute.ts` and `src/lib/input/visibility.ts`. Everything else
is a one-function-call edit inside `src/App.svelte`'s existing `tickLoop`.

## Complexity Tracking

*No entries — the Constitution Check above reported no violations.*
