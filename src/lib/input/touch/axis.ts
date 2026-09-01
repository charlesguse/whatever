import type { Direction } from '../../../sim/tick';

// Shared by the touch pad's zone geometry (FR-010) and the gamepad stick's
// tie-break (FR-020): given a 2D offset from a center point, pick exactly
// one of up/down/left/right, breaking an exact tie deterministically. The
// touch pad has no "currently reported direction" concept, so it always
// passes undefined for tieBreakDirection, which falls through to horizontal.
// dx === 0 && dy === 0 is not a valid input — callers exclude the dead-zone/
// below-threshold case before calling this.
export function resolveDominantAxis(dx: number, dy: number, tieBreakDirection?: Direction): Direction {
  const horizontal: Direction = dx >= 0 ? 'right' : 'left';
  const vertical: Direction = dy >= 0 ? 'down' : 'up';
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) return horizontal;
  if (absDy > absDx) return vertical;

  if (tieBreakDirection === horizontal || tieBreakDirection === vertical) {
    return tieBreakDirection;
  }
  return horizontal;
}
