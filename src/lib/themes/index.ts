// The one place a shipped theme is registered (research.md's
// registration-location decision). App.svelte imports this module for its
// side effect instead of calling registerTheme itself; so does any test
// exercising the real, fully-registered set.
import { registerTheme } from './registry';
import { classroomTheme } from './classroom';
import { classicTheme } from './classic';

// Order matters: listThemes()[0].id === 'classroom' (the constitution's
// default). A third theme is a one-line addition here only.
registerTheme(classroomTheme);
registerTheme(classicTheme);
