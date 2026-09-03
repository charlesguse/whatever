# Implementation Plan: Taps Never Hide The Touch Controls

**Branch**: `011-fix-touch-tap-visibility` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-fix-touch-tap-visibility/spec.md`

## Summary

Every tap on a touch screen is followed by a browser-synthesized `click`,
and today's visibility reducer treats any `click` as proof of a real mouse —
so a tap shows the controls (on `touchstart`) and immediately hides them
again (on the synthesized `click`), making the on-screen controls unusable
on a keyboard-less device. The fix (research.md) reclassifies where each
signal comes from: a new window-level `pointerdown` listener reads
`event.pointerType` to distinguish a real mouse, a touch, or a pen at the
moment of contact, `keydown` continues to mean keyboard, and `click` — which
can no longer be trusted to mean anything on its own — is downgraded to an
explicit `'unknown'` origin that never hides the controls. `origin` becomes
a first-class, explicit argument to the existing pure reducer
(`nextLastInputSource`) in `src/lib/input/visibility.ts`, closing the gap
structurally rather than with a timing heuristic. `shouldShowTouchControls`
and 007's capability-gate table are unchanged.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes — unchanged from
features 001–010.

**Primary Dependencies**: None added. Uses the standard Pointer Events API
(`PointerEvent.pointerType`), already available in every browser this
project targets; no polyfill, no new package (Principle IV, Assumptions:
"No new runtime dependency is needed").

**Storage**: N/A — this feature persists nothing new. `localStorage` usage
(theme, high score, furthest cave) is untouched.

**Testing**: `vitest`, run in the node environment (no DOM), per Principle
VII. New/changed cases live in `tests/lib/input/visibility.test.ts`,
extending 007's existing table-driven format.

**Target Platform**: Same as the whole project — any browser via `file://`,
specifically exercised here on touch-only phones/tablets and touchscreen
laptops (the spec's two user stories); verified manually per Principle VII
since CI has no browser or touchscreen.

**Project Type**: Single self-contained web page (Principle I) — no
frontend/backend split, no new project.

**Performance Goals**: No change — this feature adds one `addEventListener`
call and a handful of pure-function branches; no per-tick or per-frame cost
(the sim's hot loop, Principle VI, is untouched — this is shell-only).

**Constraints**: The visibility decision MUST stay a pure function of
capabilities and last-input-with-origin, with no clock, no timer, no live
device read beyond the capability check already established by 007 (FR-007,
mirroring 007 FR-030).

**Scale/Scope**: One file changed under `src/lib/` (`visibility.ts`), one
call-site file changed (`src/App.svelte`, listener wiring only), one test
file extended, one docs file gains a new section. No sim file, no cave data,
no theme file touched (FR-011).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. One Self-Contained Page | No new external request, file, or asset; still a single `index.html` build. | PASS |
| II. Deterministic, Tick-Based Sim | This feature touches no file under `src/sim/`, no tick logic, no PRNG. | PASS — N/A, shell-only |
| III. Themes Are Data | No theme file touched; no element identity or appearance changed. | PASS — N/A |
| IV. Simple, Dependency-Light Svelte | No new package; uses a standard browser API already reachable from existing DOM listener code in `App.svelte`. | PASS |
| V. Input Is Keyboard-First, Progressive Everything Else | Keyboard behavior (FR-002/FR-004a) and capability gating (FR-009) are preserved exactly; only touch/mouse/pen *classification* changes. | PASS |
| VI. Performance Is A Feature | One extra event listener, no hot-loop or per-tick change. | PASS |
| VII. Verifiable Without A Browser Harness | The changed logic is a pure function tested in vitest/node (FR-010); the DOM wiring itself is manually verified per FR-012/FR-012a, consistent with 007's precedent (its own listener wiring is likewise untested by CI). | PASS |

No violations. Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: data-model.md and contracts/visibility-api.md keep
`nextLastInputSource` and `shouldShowTouchControls` as pure functions with no
DOM/clock reads; the only DOM-touching change (the new `pointerdown`
listener) lives in `App.svelte`, mirroring where 007 already put
`keydown`/`click`/`touchstart` listeners. Still PASS, no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-touch-tap-visibility/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── visibility-api.md # Phase 1 output — supersedes 007's reducer contract
├── checklists/
│   └── requirements.md   # Pre-existing (spec stage)
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

Single-project structure, unchanged from every prior feature (Principle I —
one Svelte+Vite app, no frontend/backend split):

```text
src/
├── sim/                       # UNCHANGED by this feature (FR-011)
├── lib/
│   └── input/
│       ├── visibility.ts      # CHANGED — origin becomes an explicit input
│       └── touch/
│           └── TouchInput.ts  # UNCHANGED — gesture handling, not visibility
└── App.svelte                 # CHANGED — pointerdown listener added, click
                                # listener's origin argument changes

tests/
└── lib/
    └── input/
        └── visibility.test.ts # CHANGED — extended with origin rows (FR-010)

docs/
└── manual-verification.md     # CHANGED — new "Standing checks" section
                                # (FR-012, FR-012a); 007's own section is
                                # untouched (FR-012b)
```

**Structure Decision**: No structural change to the project — this feature
edits one existing sim-adjacent module (`src/lib/input/visibility.ts`, which
is shell code per `CLAUDE.md`'s Sim/Shell split, not sim), one Svelte shell
file, one test file, and one docs file. It adds no new directory.

## Complexity Tracking

*No entries — Constitution Check has no violations to justify.*
