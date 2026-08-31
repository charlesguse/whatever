# Theme Registry Contract: `src/lib/themes/` Public Surface (extends feature 001)

Extends the registry feature 001 introduced with one entry
(`registerTheme`, `getTheme`) and feature 005 extended with new `Theme`
fields but no new registry function. This document defines the surface
after this feature — the first time the registry holds more than one
theme.

Everything here is **plain TypeScript** — no Svelte import, no DOM access
— so it is readable and testable without a browser (Principle VII).

## Types (`src/lib/themes/types.ts`)

```ts
interface ThemeEntry {
  readonly fillColor: string;
  readonly glyph: string;
  readonly label: string;
}

interface Theme {
  readonly id: string;
  readonly displayName: string;   // NEW (FR-003) — the picker label, never id, never title
  readonly elements: Readonly<Record<ElementId, ThemeEntry>>;
  readonly background: string;
  readonly doorOpenEntry: ThemeEntry;
  readonly magicWallActiveEntry: ThemeEntry;
  readonly messages: { readonly dead: string; readonly completed: string };
  readonly readout: { readonly template: string };
  readonly title: string;
  readonly caveIntro: { readonly template: string };
  readonly lifeLost: { readonly label: string };
  readonly gameOver: { readonly label: string };
  readonly won: { readonly label: string };
  readonly paused: { readonly label: string };
  readonly hud: {
    readonly lives: string;
    readonly time: string;
    readonly score: string;
    readonly highScore: string;
    readonly furthestCave: string;
  };
  readonly caveComplete: { readonly label: string };
}
```

## `registerTheme(theme: Theme): void`

- **Guarantees**: Adds `theme` to the registry, keyed by `theme.id`.
- **Changed in this feature**: Throws (rather than silently overwriting)
  if a theme with `theme.id` is already registered (FR-006). The error
  names the duplicate id, so a copy-paste mistake in a new theme file is
  visible at the point registration runs (module load), not discovered
  later as a mysteriously wrong appearance.

## `getTheme(id: string): Theme`

- **Guarantees**: **Unchanged.** Returns the registered theme for `id`, or
  throws if `id` is not registered. Kept for call sites that already know
  the id is valid — in this feature, that is the renderer
  (`RenderLoopOptions.getThemeId()` is expected to always return a
  registered id, since `App.svelte` only ever sets the active id from
  `listThemes()`'s own ids or from `resolveStoredThemeId`'s fallback,
  never from unvalidated input).

## `hasTheme(id: string): boolean` (new, FR-004)

- **Guarantees**: Returns whether `id` names a registered theme, without
  throwing. Total over every input, including non-theme strings. Exists so
  a stored or cycled id can be validated with no `try`/`catch` at the call
  site — used by `resolveStoredThemeId` (see
  [theme-selection contract below](#theme-selection-new--srclibthemesselectionts-fr-005-fr-025)).

## `listThemes(): readonly Theme[]` (new, FR-001, FR-005)

- **Guarantees**: Returns every registered theme, in registration order
  (the order `registerTheme` was called for each, stable across calls —
  the registry's internal `Map` already preserves insertion order on
  iteration, so no separate order-tracking state is needed). The **only**
  source the UI's theme list is built from — a hardcoded pair of options
  anywhere in shell code is a defect this contract exists to prevent
  (FR-001). Returns a fresh array each call (no shared mutable reference);
  registering a further theme after this feature ships changes what the
  *next* call returns, never what an already-returned array contains.

## Theme Registration Entry Point: `src/lib/themes/index.ts` (new)

- **Guarantees**: Importing this module, for its side effect alone,
  registers exactly the shipped theme set — today, `classroomTheme` then
  `classicTheme`, in that order (so `listThemes()[0].id === 'classroom'`,
  matching the constitution's "Classroom is the default"). This is the
  **only** file that calls `registerTheme` for a shipped theme.
  `App.svelte` imports this module for its side effect instead of calling
  `registerTheme` directly; any test exercising the real, fully-registered
  set (e.g. the completeness check) imports this module the same way.
  Adding a third theme in the future is a one-line addition here — SC-002's
  "zero changes to the theme control, zero changes to rendering logic"
  extends to "zero changes to `App.svelte`" as a consequence of this file
  existing.

## Theme completeness (new — FR-029, SC-008)

A test-only check (not a runtime export other code calls), asserting for
every `theme` in `listThemes()`:

- `theme.elements` has a key for every id in `ELEMENT_IDS`
  (`src/sim/elements.ts`), and no extra keys.
- `theme.doorOpenEntry` and `theme.magicWallActiveEntry` are present.
- Every declared player-facing string field (`displayName`, `title`,
  `messages.dead`, `messages.completed`, `readout.template`,
  `caveIntro.template`, `lifeLost.label`, `gameOver.label`, `won.label`,
  `paused.label`, `hud.lives`, `hud.time`, `hud.score`, `hud.highScore`,
  `hud.furthestCave`, `caveComplete.label`) is present and a non-empty
  string.

On any violation, the check fails, and the failure message names both the
offending theme's `id` and the specific missing element id or field —
never a bare boolean failure (FR-029).

## Theme Selection (new — `src/lib/themes/selection.ts`, FR-005, FR-025)

```ts
function cycleThemeId(currentId: string, order: readonly string[]): string;
function resolveStoredThemeId(
  stored: unknown,
  registeredIds: readonly string[],
  fallbackId: string,
): string;
```

- `cycleThemeId`: returns the id immediately after `currentId` in `order`;
  wraps to `order[0]` if `currentId` is the last entry (or not found in
  `order` at all — treated the same as "wrap to the first," never a
  throw). Returns `currentId` unchanged if `order.length < 2`.
- `resolveStoredThemeId`: returns `stored` unchanged only if it is a
  `string` present in `registeredIds`; returns `fallbackId` for every
  other input — `undefined`, `null`, a number, an object, or a string not
  present in `registeredIds` (FR-025). Total, never throws.

Both are pure and take no dependency on `registry.ts` directly — callers
pass `listThemes().map(t => t.id)` (or a subset, for testing) as `order`/
`registeredIds`, which is what makes both functions testable with hand-built
fixture id lists, independent of which themes are actually shipped.

## What is explicitly NOT part of this contract

Which key cycles the theme (`src/lib/input/keyboard.ts`, see
[keyboard-api.md](./keyboard-api.md)); where the active theme id is stored
between renders (a local `App.svelte` `$state`, not part of this module,
per `data-model.md`'s active-theme-selection entry); persistence of the
chosen id (`src/lib/storage/save.ts`, see [save-api.md](./save-api.md));
rendering (`src/lib/render/canvas.ts`, unchanged — already resolves
appearance generically by element id via the existing `getThemeId()`
callback).
