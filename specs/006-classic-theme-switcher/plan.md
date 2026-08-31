# Implementation Plan: Classic Theme And An In-Game Theme Switcher

**Branch**: `006-classic-theme-switcher` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-classic-theme-switcher/spec.md`

## Summary

Features 001–005 built the theme contract (`Theme`/`ThemeEntry`, a registry,
a canvas renderer that resolves appearance generically) but only ever
registered one theme, `classroom`, and hardcoded its id as a constant in
`App.svelte`. Constitution Principle III has required "at least two themes
and an in-game theme selector that switches live, mid-cave" since
ratification; this feature is the first time that contract is actually
exercised by a second implementation. Two things change: a **Classic**
theme (`src/lib/themes/classic.ts`) supplying an entry for every one of the
fourteen element ids plus the open-door and running-magic-wall appearances
and every player-facing string, in the original's earth-brown/grey/white
palette with an original (non-trademarked) title; and an **active theme
selection** that becomes real shell state instead of a constant — driven by
an always-visible, keyboard-and-pointer-operable list plus a dedicated
`cycleTheme` input action, persisted into the existing `recess-rocks:save`
record, and read fresh every rendered frame so a switch is a pure
re-render with no effect on the sim.

The registry (`src/lib/themes/registry.ts`) gains the surface a real
registry needs and never had with one entry: an ordered enumeration
(`listThemes()`), a non-throwing existence check (`hasTheme()`), and a
duplicate-id guard on `registerTheme()`. Registration moves out of
`App.svelte`'s component script into a themes-module side effect
(`src/lib/themes/index.ts`) so the registry can be exercised — and a
completeness check run against it — from a plain `vitest` test with no
Svelte involved (FR-029, SC-008). `src/lib/storage/save.ts`'s `SaveRecord`
gains an optional `themeId` field; because the existing `writeSave` merge
is a blanket grow-only (`Math.max`) pattern that is wrong for a theme
choice (FR-027 — last-write-wins, not grow-only), the merge becomes
per-field rather than a single object-literal `Math.max` call, with every
existing numeric-field test continuing to pass unchanged. `src/lib/input/
keyboard.ts` gains one more named one-shot action, `cycleTheme`, following
exactly the existing restart/pause pattern, consumed early in `App.svelte`'s
`stepTickInner()` (mirroring how restart is checked before the
per-screen branches) so it reaches every screen including `'title'`
without ever falling through to that screen's "start the game" check
(FR-035).

No file under `src/sim/` changes. The renderer's existing `resolveEntry()`
special-casing of the open door and running magic wall is untouched — those
fields already exist in the theme contract from feature 005, so Classic
simply supplies values for them like every other field (FR-009). Cave names
stay theme-neutral game content, per spec FR-030 and Assumptions — no theme
gains a per-cave name list.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled by Vite; Svelte 5 (runes) —
unchanged from features 001–005

**Primary Dependencies**: Unchanged — Svelte 5, Vite, `vite-plugin-singlefile`,
`@sveltejs/vite-plugin-svelte`, vitest. No new runtime dependency. No sim
file changes, so the seeded PRNG gains no new consumer.

**Storage**: Browser `localStorage`, best-effort, one JSON record under the
existing `recess-rocks:save` key — **extended**, not replaced, per FR-025.
`SaveRecord` gains one optional field, `themeId: string | undefined`,
merged **last-write-wins** (FR-027), distinct from `highScore` and
`furthestCave`'s existing grow-only (`Math.max`) merge. Every read/write
stays wrapped so a throwing, full, or absent `localStorage` degrades
silently (FR-026), unchanged from feature 005's pattern.

**Testing**: vitest, run headless (`npm test`, builds first), no DOM/canvas/
audio-device/browser-automation packages — unchanged. The registry's
enumeration, the duplicate-id guard, the Classic theme's completeness, the
save-record's per-field merge behavior, and the `cycleTheme` keyboard
action are all plain unit tests over plain data, following features 001–005's
pattern exactly (FR-029, SC-008).

**Target Platform**: Any modern browser via `file://`, one build artifact —
unchanged

**Project Type**: Single front-end project — unchanged. No router, no
second HTML page. The theme control is markup within the one existing
Svelte component tree (`App.svelte` remains the only `.svelte` file),
rendered outside every screen-conditional block so it appears on all eight
screens named in FR-021.

**Performance Goals**: Steady frame rate — 60fps target / 30fps floor
(constitution Principle VI) — held across a live theme switch. The
renderer already re-reads the active theme id every frame via a callback
(`RenderLoopOptions.getThemeId`), so a switch costs exactly one extra
object read per frame going forward, not a new code path (SC-004).

**Constraints**: Zero network requests at play time; zero new image/font/
audio files (Classic's look is code-drawn colors/glyphs/text, per
Principle I and III); zero files under `src/sim/` touched (FR-012); zero
rendering or shell comparisons against a theme id or name (FR-013) — where
Classic cannot be expressed in the existing contract, the contract gains a
field both themes supply, per FR-014 (this plan's research finds no such
gap: the existing `ThemeEntry`/`doorOpenEntry`/`magicWallActiveEntry`/
string fields are sufficient, so the only contract addition is the display
name FR-003 already calls for).

**Scale/Scope**: Two registered themes (Classroom, Classic); one new theme
data file (~14 element entries + ~2 transient entries + ~14 string fields,
matching feature 005's Classroom shape); one new registry function pair
(`listThemes`, `hasTheme`) plus a duplicate-id guard; one new keyboard
action; one new optional `SaveRecord` field with restructured per-field
merge; one new small pure module for theme-selection logic (cycling,
stored-id resolution); one new always-visible list control in `App.svelte`'s
markup. No new element ids, no new caves, no new `Grid` typed arrays.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. One Self-Contained Page | Classic's entire look is theme-data strings/colors/glyphs consumed by the existing canvas renderer and existing DOM markup — no new asset file, no new page, no CDN/network call; the theme control is markup in the existing single component tree | PASS |
| II. Deterministic, Tick-Based Sim | Zero files under `src/sim/` change (FR-012); the active theme id lives in the shell and is read by the renderer only, never by `tick()`; switching cannot perturb `grid`, `tick`, `remainingTimeTicks`, or the PRNG's position (FR-022, FR-023) | PASS |
| III. Themes Are Data, Not Code | This feature is the contract's first real second implementation: a second theme, a real enumerable registry, and a control that lists themes rather than hardcoding a pair (FR-001, FR-002). No rendering or shell logic branches on theme id (FR-013); a hypothetical third theme needs only a new registry entry (SC-002) | PASS |
| IV. Simple, Dependency-Light Svelte | No new runtime dependency. Theme cycling/stored-id-resolution logic is a new plain-TypeScript module, no Svelte import, matching the sim/session precedent; `App.svelte` gains markup and thin plumbing only | PASS |
| V. Keyboard-First Input | The theme control is fully keyboard-operable (FR-017) with pointer support additive, never pointer-only (FR-034); the cycle input is a named action like restart/pause, reachable on every screen (FR-020, FR-021), reserving one key that no gameplay action uses so the guarantee holds structurally, not by careful handling (FR-020, SC-011) | PASS |
| VI. Performance Is A Feature | A theme switch is a no-op write plus a changed callback return value read once per frame — no extra per-tick allocation, no new hot-loop object; frame rate must hold >= 30fps across the switch (SC-004) | PASS |
| VII. Verifiable Without A Browser | Every acceptance test named in the spec (registry enumeration, Classic completeness, tick-identical-with-and-without-a-switch, held-input survival, storage fallback cases, completeness-check failure on a deliberately incomplete fixture) is a plain `vitest` unit test over plain data or a fixture cave — no DOM, canvas, or browser automation added. Visual judgment of whether Classic "looks right" is the maintainer's at review time (Assumptions, Principle VII) | PASS |

No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-classic-theme-switcher/
├── plan.md                     # This file (/speckit-plan command output)
├── research.md                  # Phase 0 output (/speckit-plan command)
├── data-model.md                 # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                      # Phase 1 output (/speckit-plan command)
│   ├── theme-registry-api.md        # extends 001's theme contract — the real registry surface
│   ├── keyboard-api.md               # extends 005's input contract — the cycleTheme action
│   └── save-api.md                    # extends 005's storage contract — themeId, per-field merge
├── checklists/
│   └── requirements.md
└── tasks.md                            # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additive over the feature-001–005 skeleton. No new top-level directories;
the only new files are one theme data file, one small pure
theme-selection module, and test files mirroring each.

```text
src/
├── sim/                            # UNCHANGED — FR-012, no file under src/sim/ is touched
├── lib/
│   ├── themes/
│   │   ├── types.ts                 # UNCHANGED shape — the existing Theme/ThemeEntry fields are
│   │   │                            #   sufficient for Classic (research.md); only FR-003's display
│   │   │                            #   name is new, and it lands here as one added field
│   │   ├── registry.ts               # + listThemes(): readonly Theme[] (registration order, FR-005);
│   │   │                             #   + hasTheme(id): boolean (FR-004, non-throwing);
│   │   │                             #   registerTheme() now throws on a duplicate id (FR-006)
│   │   ├── classroom.ts               # + displayName field only; every existing field unchanged
│   │   │                              #   (FR-032 — no wording regression)
│   │   ├── classic.ts                  # NEW — full Theme implementation: earth-brown dirt, grey
│   │   │                               #   boulders, white diamonds, brick/steel walls, Rockford,
│   │   │                               #   original non-trademarked title (FR-007–FR-011)
│   │   ├── index.ts                     # NEW — the one place both themes are registered as a
│   │   │                                #   module side effect; App.svelte imports this instead of
│   │   │                                #   calling registerTheme itself (research.md)
│   │   └── selection.ts                  # NEW — pure: cycleThemeId(currentId, order) -> next id
│   │                                     #   (wraps, FR-005/edge case); resolveStoredThemeId(stored,
│   │                                     #   registry) -> valid id or Classroom fallback (FR-025)
│   ├── storage/
│   │   └── save.ts                        # SaveRecord + themeId?: string; writeSave's merge becomes
│   │                                       #   per-field: highScore/furthestCave stay grow-only
│   │                                       #   (Math.max, unchanged behavior), themeId becomes
│   │                                       #   last-write-wins (FR-027)
│   ├── input/
│   │   └── keyboard.ts                     # + one-shot cycleTheme action, same shape as restart/pause
│   │                                       #   (FR-033); bound to a key none of direction/grab/
│   │                                       #   restart/start/pause use (FR-020, SC-011)
│   └── render/
│       └── canvas.ts                        # UNCHANGED — already reads the active theme id fresh
│                                            #   every frame via getThemeId(); a switch is already a
│                                            #   pure re-render by construction (SC-004)
└── App.svelte                                # active theme id becomes real $state instead of the
                                              # THEME_ID constant, initialized from resolveStoredThemeId
                                              # against readSave(); imports './lib/themes' for its
                                              # registration side effect instead of calling
                                              # registerTheme itself; stepTickInner() consumes
                                              # cycleTheme early (alongside restart) so it reaches
                                              # every screen without falling into the title screen's
                                              # start-game check (FR-035); markup gains an
                                              # always-visible, keyboard-and-pointer-operable theme
                                              # list outside every screen-conditional block, hidden
                                              # if listThemes().length < 2 (FR-019); every selection
                                              # writes the new theme id to state and to storage
                                              # immediately (FR-028), a no-op if already active
                                              # (FR-018)

tests/
├── lib/
│   ├── themes/
│   │   ├── classroom.test.ts                # UPDATED — + displayName present; existing assertions
│   │   │                                     #   unchanged (FR-032)
│   │   ├── classic.test.ts                   # NEW — completeness (every element id, open door,
│   │   │                                     #   magic wall active, every string field), distinctness
│   │   │                                     #   from Classroom, closed exit === steel wall (FR-008),
│   │   │                                     #   no trademarked title (FR-011)
│   │   ├── registry.test.ts                   # NEW — listThemes() order and enumeration, hasTheme()
│   │   │                                       #   non-throwing behavior, duplicate-id registration
│   │   │                                       #   throws (FR-001, FR-004, FR-005, FR-006)
│   │   ├── registry-completeness.test.ts        # NEW — FR-029/SC-008: iterates listThemes() (after
│   │   │                                        #   importing './lib/themes' for real registration)
│   │   │                                        #   against every element id and required field;
│   │   │                                        #   fails, naming the theme and the missing piece, for
│   │   │                                        #   a deliberately incomplete fixture theme
│   │   └── selection.test.ts                     # NEW — cycleThemeId wraps at the end of the order;
│   │                                              #   resolveStoredThemeId: registered id restored,
│   │                                              #   unregistered/non-string/absent all fall back to
│   │                                              #   Classroom (FR-025)
│   ├── storage/
│   │   └── save.test.ts                            # UPDATED — themeId last-write-wins alongside
│   │                                                #   highScore/furthestCave's unchanged grow-only
│   │                                                #   behavior in the same writeSave call (FR-027);
│   │                                                #   every existing case (throwing storage, invalid
│   │                                                #   values) re-run to confirm no regression
│   └── input/
│       └── keyboard.test.ts                         # NEW — no prior test file exists for
│                                                     #   KeyboardInput; covers cycleTheme as one-shot
│                                                     #   like restart/pause, and asserts it shares no
│                                                     #   key with any direction/grab/restart/start/
│                                                     #   pause binding (SC-011)
└── sim/…                                              # UNCHANGED — re-run to confirm FR-031's
                                                        # no-regression guarantee; no test here changes
```

**Structure Decision**: Same single Svelte/Vite project as features
001–005; no new top-level directories. The active theme selection follows
the same "plain TypeScript module under `src/lib/`, no Svelte import"
precedent feature 005 set for `src/lib/session/` — here as
`src/lib/themes/selection.ts`, kept small because, unlike a `SessionState`,
the active theme id needs no complex transition table: it is either
"cycle to the next registered id" or "resolve a stored id against the
registry," both pure and total. Tests continue to live under `tests/`,
mirroring `src/`'s shape, with new files landing in the existing
`tests/lib/themes/`, `tests/lib/storage/`, and `tests/lib/input/`
directories rather than new top-level test directories.

## Complexity Tracking

*No violations — table not needed.*
