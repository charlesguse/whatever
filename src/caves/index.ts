import { cave01 } from './cave-01-dig-and-collect';
import { cave02 } from './cave-02-falling';
import { cave03 } from './cave-03-rolling-and-pushing';
import { cave04 } from './cave-04-fireflies';
import { cave05 } from './cave-05-butterflies';
import { cave06 } from './cave-06-magic-wall';
import { cave07 } from './cave-07-amoeba';
import { cave08 } from './cave-08-finale';
import type { CaveDefinition } from '../sim/cave';

// The eight shipped caves (FR-031, FR-032), in the fixed difficulty-curve
// order: dig and collect, falling, rolling and pushing, fireflies,
// butterflies, the magic wall, the amoeba, and a finale combining all of
// the above.
export const CAVES: readonly CaveDefinition[] = [
  cave01,
  cave02,
  cave03,
  cave04,
  cave05,
  cave06,
  cave07,
  cave08,
];
