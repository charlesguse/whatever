export type ElementId =
  | 'empty'
  | 'dirt'
  | 'boulder'
  | 'diamond'
  | 'brickWall'
  | 'steelWall'
  | 'player'
  | 'firefly'
  | 'butterfly'
  | 'amoeba'
  | 'magicWall'
  | 'expandingWall'
  | 'exit'
  | 'explosion';

export const ELEMENT_IDS: readonly ElementId[] = [
  'empty',
  'dirt',
  'boulder',
  'diamond',
  'brickWall',
  'steelWall',
  'player',
  'firefly',
  'butterfly',
  'amoeba',
  'magicWall',
  'expandingWall',
  'exit',
  'explosion',
];

// The single shared ASCII character <-> element id mapping (FR-032). Both
// shipped cave data (src/caves/) and the test harness (tests/sim/helpers/)
// import this table so there is structurally only one mapping to drift.
export const CHAR_TO_ELEMENT: Readonly<Record<string, ElementId>> = {
  '.': 'empty',
  '#': 'dirt',
  'o': 'boulder',
  '*': 'diamond',
  'B': 'brickWall',
  'S': 'steelWall',
  'P': 'player',
  'F': 'firefly',
  'Y': 'butterfly',
  'A': 'amoeba',
  'M': 'magicWall',
  'E': 'expandingWall',
  'X': 'exit',
  '!': 'explosion',
};

export const ELEMENT_TO_CHAR: Readonly<Record<ElementId, string>> = Object.fromEntries(
  Object.entries(CHAR_TO_ELEMENT).map(([char, id]) => [id, char])
) as Record<ElementId, string>;

export const ELEMENT_ID_TO_INDEX: Readonly<Record<ElementId, number>> = Object.fromEntries(
  ELEMENT_IDS.map((id, index) => [id, index])
) as Record<ElementId, number>;

export const INDEX_TO_ELEMENT_ID: readonly ElementId[] = ELEMENT_IDS;
