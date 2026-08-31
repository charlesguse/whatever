# Phase 1 Data Model: Classic Theme And An In-Game Theme Switcher

Entities below extend feature 005's data model
([`specs/005-arcade-shell-caves/data-model.md`](../005-arcade-shell-caves/data-model.md)),
which itself extends features 001–004's. Sim entities (Element, Grid, Cave
Definition/State, the cave clock, Roll Surface, Push Resolution, Enemy
Step, Blast/Chain, Amoeba/Magic Wall/Expanding Wall, `Screen`,
`SessionState`, Score) are unchanged and not repeated — this feature
touches no file under `src/sim/` (FR-012) and adds no field to
`SessionState` (research.md's active-theme-selection decision). This
feature extends the `Theme` shape by exactly one field, makes the registry
a real enumerable registry, adds one new theme instance, extends
`SaveRecord`, adds one keyboard action, and adds one small new pure module.

## Theme (extends feature 005's `Theme`/`ThemeEntry` shape — `src/lib/themes/types.ts`)

| Field | Type | Notes |
|---|---|---|
| `displayName` | `string` | **New (FR-003).** The label the theme control shows — distinct from `id` (never shown to the player) and from `title` (the in-game name shown on the title screen under that theme, unchanged since feature 005). Every registered theme MUST supply a non-empty `displayName`; the completeness check (below) enforces this the same way it enforces every element entry. |

Every other field (`id`, `elements: Readonly<Record<ElementId, ThemeEntry>>`,
`background`, `doorOpenEntry`, `magicWallActiveEntry`, `messages`,
`readout`, `title`, `caveIntro`, `lifeLost`, `gameOver`, `won`, `paused`,
`hud`, `caveComplete`) is unchanged from feature 005 — research.md's
contract-sufficiency decision found no gap Classic cannot express with the
existing shape.

## Classic Theme (new — `src/lib/themes/classic.ts`)

| Concept | Notes |
|---|---|
| `id` | `'classic'`. |
| `displayName` | An original, non-trademarked label for the theme picker (FR-003, FR-011). |
| `title` | An original, non-trademarked in-game name (FR-011) — the maintainer's exact wording pick at review, per Assumptions. |
| Element entries | All fourteen `ElementId`s (FR-007): earth-brown `dirt`, grey `boulder`, glittering-white `diamond`, a `brickWall` and `steelWall` distinguishable from each other (mirroring Classroom's locker/whiteboard-wall distinction), `player` as Rockford, plus `firefly`, `butterfly`, `amoeba`, `magicWall`, `expandingWall`, `exit`, `explosion`, `empty`. |
| `exit` entry | **Identical** `fillColor`/`glyph`/`label` to `steelWall`'s entry (FR-008) — the same rule Classroom already follows, so the door is indistinguishable from a wall until the quota is met, under either theme. |
| `doorOpenEntry`, `magicWallActiveEntry` | Each visibly distinct from `exit`/`magicWall`'s inert entries and from every other entry in the theme (FR-009), mirroring Classroom's existing transient entries. |
| String fields | `messages.dead`/`messages.completed`, `readout.template`, `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`, `paused.label`, `hud.lives`/`hud.time`/`hud.score`/`hud.highScore`/`hud.furthestCave`, `caveComplete.label` — every one populated, in classic-setting wording, using the same `{placeholder}` tokens as Classroom's equivalent field so the shell substitutes them identically (FR-010). |

**Validation (module-load self-check, mirroring `classroom.ts`'s existing
pattern):** `classic.ts` iterates `ELEMENT_IDS` and throws if any is
missing, exactly as `classroom.ts` already does — this is the per-file
guard; the registry-wide check (FR-029) is separate and described below.

## Theme Registry (extends feature 001's registry — `src/lib/themes/registry.ts`)

| Member | Signature | Notes |
|---|---|---|
| `registerTheme(theme)` | `(theme: Theme) => void` | **Changed.** Now throws if `theme.id` is already registered (FR-006), rather than silently overwriting via `Map.set`. |
| `getTheme(id)` | `(id: string) => Theme` | **Unchanged.** Throws for an unknown id — kept for call sites that already know the id is valid (e.g. the renderer, given an id already resolved against the registry). |
| `hasTheme(id)` | `(id: string) => boolean` | **New (FR-004).** Non-throwing existence check, so a stored or cycled id can be validated with no `try`/`catch`. |
| `listThemes()` | `() => readonly Theme[]` | **New (FR-001, FR-005).** Enumerates every registered theme in registration order (the internal `Map`'s insertion order, which `Map` already preserves — no separate order-tracking needed). The UI's only source of the option list; a hardcoded pair of options is a defect (FR-001). |

## Theme Registration Entry Point (new — `src/lib/themes/index.ts`)

The one place `registerTheme(classroomTheme)` and
`registerTheme(classicTheme)` are called, as a module-load side effect
(research.md's registration-location decision). `App.svelte` imports this
module for that side effect instead of calling `registerTheme` itself,
and `tests/lib/themes/registry-completeness.test.ts` imports it the same
way to exercise the real registered set with no Svelte or DOM involved.

## Theme Completeness Check (new — `src/lib/themes/completeness.ts` or inline in its test, FR-029/SC-008)

| Concept | Notes |
|---|---|
| Input | `listThemes()` — every currently registered theme, not a hand-picked subset. |
| Checks per theme | An entry present for every id in `ELEMENT_IDS` (`src/sim/elements.ts`); `doorOpenEntry` and `magicWallActiveEntry` present; every declared player-facing string field (`title`, `displayName`, `messages.dead`, `messages.completed`, `readout.template`, `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`, `paused.label`, `hud.*` (five fields), `caveComplete.label`) present and non-empty. |
| Failure mode | Fails naming both the theme's `id` and the specific missing element id or field (FR-029), demonstrated against a deliberately incomplete fixture theme constructed in the test itself (not a shipped theme) so the check's own failure path is exercised without breaking the build. |
| Where it runs | Inside the existing `vitest` suite (`npm test`/`npm run test:unit`), no new build tooling — a new element id added to `ELEMENT_IDS` with no matching theme update fails this test for every registered theme, per Acceptance Scenario 3 of User Story 4. |

## Active Theme Selection (new — `src/lib/themes/selection.ts`, plain TypeScript, no Svelte import)

| Function | Signature | Notes |
|---|---|---|
| `cycleThemeId(currentId, order)` | `(currentId: string, order: readonly string[]) => string` | Returns the id following `currentId` in `order` (the ids from `listThemes()`, in registration order); wraps to `order[0]` past the last one (spec Edge Cases — "cycle input pressed past the last theme... wraps to the first registered theme in registration order," FR-005 continuity). If `order` has fewer than 2 entries, returns `currentId` unchanged (nothing to cycle to; also the FR-019 hidden-control case, where this function is simply never called). |
| `resolveStoredThemeId(stored, registeredIds, fallbackId)` | `(stored: unknown, registeredIds: readonly string[], fallbackId: string) => string` | Returns `stored` if it is a string present in `registeredIds`; returns `fallbackId` (Classroom's id) for every other case — not a string, `undefined`/absent, or a string naming an unregistered theme (FR-025, Edge Cases). Pure and total; used once, at load, against `readSave().themeId` and `listThemes().map(t => t.id)`. |

Where "the active theme id" itself lives: a plain `$state<string>` local
to `App.svelte`, read by the render loop's existing
`RenderLoopOptions.getThemeId` callback (feature 005, unchanged) — not a
new field on `SessionState` (research.md's decision; the spec's Key
Entities section states this explicitly: "Lives in the shell, never in
the simulation").

## Theme Control (new — markup in `App.svelte`, no new component file)

| Concept | Notes |
|---|---|
| Visibility | Rendered unconditionally, outside every screen-conditional block, so it is present on all eight screens FR-021 names (title, cave-intro, in-play, paused, life-lost, game-over, win, and the caveComplete tally); hidden entirely when `listThemes().length < 2` (FR-019). |
| Content | One entry per `listThemes()` result, in registration order, each showing that theme's `displayName` (never its `id`), with the currently active one indicated (FR-017, Acceptance Scenario 5). |
| Keyboard operability | Every entry reachable and selectable using the keyboard alone (FR-017); this is the guarantee, not an incidental affordance. |
| Pointer operability | The same list additionally responds to a click/tap per entry (FR-034) — additive, never the only way to reach an entry. |
| Selection effect | Updates the `$state` active theme id; a no-op (no state change, no storage write, no re-render artifact) if the selected id is already active (FR-018); otherwise writes the new id to storage immediately via `writeSave({ themeId })` (FR-028), using the per-field merge described below. |
| Focus behavior | Never takes keyboard focus away from the game while a cave is running, and never suppresses a gameplay key while it holds focus (FR-020 — a control that swallows gameplay keys while focused does not satisfy this requirement even if no tick is dropped). |

## Keyboard Input (extends feature 005's `KeyboardInput` — `src/lib/input/keyboard.ts`)

| Member | Notes |
|---|---|
| `CYCLE_THEME_KEYS` | New `Set<string>`, default `{'t', 'T'}` (research.md's flagged decision — maintainer-reassignable at review), disjoint from `KEY_TO_DIRECTION`, `GRAB_KEYS`, `RESTART_KEYS`, `START_KEYS`, `PAUSE_KEYS` (SC-011). |
| `cycleThemePending` | New private one-shot boolean field, same shape as `restartPending`/`pausePending`. |
| `consumeCycleTheme()` | `(): boolean` — reports and clears the one-shot pending flag, same shape as `consumeRestart()`/`consumePause()` (FR-033). |

Consumed in `App.svelte`'s `stepTickInner()` unconditionally, before any
`session.screen` branch — including before the `'title'` branch that
currently treats a start/direction/grab key as game-starting input — so a
`cycleTheme` press is never evaluated as a start/direction/grab key and
never falls through to start a cave (FR-035, research.md's placement
decision).

## Saved Record (extends feature 005's `SaveRecord` — `src/lib/storage/save.ts`)

| Field | Type | Merge rule | Notes |
|---|---|---|---|
| `highScore` | `number` | Grow-only: `Math.max(current, incoming)` | **Unchanged** from feature 005. |
| `furthestCave` | `number` | Grow-only: `Math.max(current, incoming)` | **Unchanged** from feature 005. |
| `themeId` | `string \| undefined` | Last-write-wins: `incoming ?? current` | **New (FR-025, FR-027).** Absent from a `writeSave` call (e.g. a score/cave-progress write unrelated to a theme switch) leaves the stored value untouched. A present value — even one that sorts lower or earlier than the stored one — always replaces it (FR-027's explicit "must not be rejected by the record's merge behavior"). Validated on read only as "is it a string"; whether it names a *registered* theme is resolved separately, by `resolveStoredThemeId` against the live registry, keeping `save.ts` theme-registry-agnostic. |

Storage behavior otherwise unchanged from feature 005: `readSave()`/
`writeSave()` remain wrapped in `try`/`catch`, and every failure — absent,
disabled, full, or throwing `localStorage` — degrades silently, never
reaching the player and never blocking a switch from applying for the
current session (FR-026).

## What is explicitly unchanged

`src/sim/**` (FR-012); `src/lib/render/canvas.ts`'s `resolveEntry()`
special-casing of the open door and running magic wall (already generic
over the active theme, not over theme identity — Classic supplies values
for the same two fields Classroom already does); `SessionState` and every
session transition function (`startGame`, `tickSession`, `pauseToggle`,
`restartAttempt`, `advanceScreen`, `endAttempt`); cave data
(`src/caves/**`) — cave names stay theme-neutral game content (FR-030).
