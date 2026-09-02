import { getCell, getCollected, getRemainingSeconds, isDoorOpen, isExplosion, isFalling, getPlayerPosition } from '../../sim/cave';
import type { CaveState } from '../../sim/cave';
import type { ElementId } from '../../sim/elements';
import type { SessionState } from '../session/types';

// The closed eight-id sound-event vocabulary (FR-001). Adding a ninth id is
// a spec change, not an implementation detail.
export type SoundEventId =
  | 'dirtStep'
  | 'fallStart'
  | 'fallLand'
  | 'diamondCollected'
  | 'doorOpen'
  | 'explosion'
  | 'timeLow'
  | 'bonusTally';

function isBoulderOrDiamond(id: ElementId): boolean {
  return id === 'boulder' || id === 'diamond';
}

// True when (x, y) held a *resting* (not falling) boulder/diamond in the
// given snapshot — the "physics predecessor" check research.md's
// fallStart/fallLand decision is built on.
function isRestingBody(cave: CaveState, x: number, y: number): boolean {
  return isBoulderOrDiamond(getCell(cave, x, y)) && !isFalling(cave, x, y);
}

// Pure: derives the sound events implied by two consecutive SessionState
// snapshots, reading only prev.screen/prev.caveState and
// next.screen/next.caveState/next.screenTicks through the sim's existing
// read-only accessors — never score, lives, caveIndex, or any
// camera/viewport state (FR-042a). See data-model.md's Sound Event table
// and research.md's flagged fallStart/fallLand decision for the exact
// per-id rules this implements.
export function deriveSoundEvents(prev: SessionState, next: SessionState): readonly SoundEventId[] {
  if (next.screen === 'caveComplete') {
    return ['bonusTally'];
  }

  if (next.screen !== 'playing') {
    return [];
  }

  const prevCave = prev.caveState;
  const nextCave = next.caveState;

  const prevPos = getPlayerPosition(prevCave);
  const nextPos = getPlayerPosition(nextCave);
  const dirtStep =
    (prevPos.x !== nextPos.x || prevPos.y !== nextPos.y) &&
    getCell(prevCave, nextPos.x, nextPos.y) === 'dirt';

  const diamondCollected = getCollected(nextCave) > getCollected(prevCave);
  const doorOpen = isDoorOpen(nextCave) && !isDoorOpen(prevCave);

  const width = nextCave.width;
  const height = nextCave.height;

  // Plain nested loops over primitive booleans — never a per-cell array or
  // object (FR-019, research.md's interpretation).
  let explosion = false;
  let fallStart = false;
  let fallLand = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!explosion && !isExplosion(prevCave, x, y) && isExplosion(nextCave, x, y)) {
        explosion = true;
      }

      if (!fallLand) {
        const prevId = getCell(prevCave, x, y);
        if (
          isBoulderOrDiamond(prevId) &&
          isFalling(prevCave, x, y) &&
          getCell(nextCave, x, y) === prevId &&
          !isFalling(nextCave, x, y)
        ) {
          fallLand = true;
        }
      }

      if (!fallStart) {
        const nextId = getCell(nextCave, x, y);
        if (isBoulderOrDiamond(nextId) && isFalling(nextCave, x, y) && getCell(prevCave, x, y) === 'empty') {
          const aboveResting = y > 0 && isRestingBody(prevCave, x, y - 1);
          const leftResting = x > 0 && isRestingBody(prevCave, x - 1, y);
          const rightResting = x < width - 1 && isRestingBody(prevCave, x + 1, y);
          if (aboveResting || leftResting || rightResting) {
            fallStart = true;
          }
        }
      }
    }
  }

  const nextRemaining = getRemainingSeconds(nextCave);
  const timeLow = nextRemaining !== undefined && nextRemaining <= 10 && nextRemaining !== getRemainingSeconds(prevCave);

  // Built in SoundEventId declaration order, at most one entry per id
  // (FR-011); a small, fixed-upper-bound (<=8) array built once per call.
  const events: SoundEventId[] = [];
  if (dirtStep) events.push('dirtStep');
  if (fallStart) events.push('fallStart');
  if (fallLand) events.push('fallLand');
  if (diamondCollected) events.push('diamondCollected');
  if (doorOpen) events.push('doorOpen');
  if (explosion) events.push('explosion');
  if (timeLow) events.push('timeLow');
  return events;
}
