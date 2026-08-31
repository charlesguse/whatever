# Storage Contract: `src/lib/storage/save.ts` Public Surface (extends feature 005)

Feature 005 introduced one JSON record under one `localStorage` key
(`highScore`, `furthestCave`), both grow-only. This feature adds one
field, `themeId`, with a genuinely different merge rule — the first field
in this record that is not grow-only — per the maintainer's directive
(spec Assumptions) to extend the existing record rather than open a
second storage key.

## Types

```ts
const STORAGE_KEY = 'recess-rocks:save'; // UNCHANGED

interface SaveRecord {
  readonly highScore: number;
  readonly furthestCave: number;
  readonly themeId?: string; // NEW (FR-025)
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
```

## `readSave(storage = defaultStorage()): SaveRecord`

- **Guarantees (unchanged for `highScore`/`furthestCave`)**: A missing,
  unreadable, non-numeric, negative, or (for `furthestCave`) out-of-range
  stored value is treated as absent and defaults apply (`highScore: 0`,
  `furthestCave: MIN_CAVE`).
- **New for `themeId`**: A missing, unreadable, or non-string stored value
  yields `themeId: undefined` in the returned record — `readSave` itself
  does **not** know about the theme registry and does not attempt to
  validate that the string names a *registered* theme; it only validates
  "is this a string." Resolving `undefined` or an unregistered id to
  Classroom is `resolveStoredThemeId`'s job
  ([theme-registry-api.md](./theme-registry-api.md)), called by
  `App.svelte` with this function's return value — keeping `save.ts`
  theme-registry-agnostic, the same separation it already keeps from cave
  data (it validates `furthestCave` is numerically in range, but has no
  notion of which cave numbers exist as content).
- **Unchanged**: every read wrapped in `try`/`catch`; a throwing or absent
  `localStorage` yields the all-defaults record, silently (FR-026).

## `writeSave(record: Partial<SaveRecord>, storage = defaultStorage()): void`

- **Changed in this feature**: the merge is now per-field rather than one
  object-literal `Math.max` call:
  - `highScore`: `Math.max(current.highScore, record.highScore ?? current.highScore)` — **unchanged behavior** from feature 005 (grow-only).
  - `furthestCave`: `Math.max(current.furthestCave, record.furthestCave ?? current.furthestCave)` — **unchanged behavior**.
  - `themeId`: `record.themeId ?? current.themeId` — **new**, last-write-wins (FR-027). A call that does not pass `themeId` (e.g. the existing score/cave-progress writes in `saveOnTransition`) leaves the stored value untouched. A call that does pass one always replaces the stored value, including with an id that sorts lower or earlier than the current one — FR-027's explicit requirement that theme choice "must not be rejected by the record's merge behavior" the way a lower score or earlier cave number would be.
- **Unchanged**: every write wrapped in `try`/`catch`; a throwing, full, or
  disabled `localStorage` degrades silently and never prevents the switch
  from applying for the current session — only the persisted copy is lost
  (FR-026, Edge Cases).
- **Call-site note (FR-028)**: the theme control's selection handler in
  `App.svelte` calls `writeSave({ themeId })` at the moment the player
  changes the theme — not deferred to the next score/cave-progress write —
  so a player who closes the page mid-cave keeps their choice.

## What is explicitly NOT part of this contract

Whether a `themeId` string names a currently *registered* theme (resolved
by `resolveStoredThemeId`, [theme-registry-api.md](./theme-registry-api.md),
using this module's `readSave()` output as input, not by this module
itself); which UI action produces a `writeSave({ themeId })` call (the
theme control's selection handler in `App.svelte`).
