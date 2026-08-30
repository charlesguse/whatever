// The rendering layer's own derived state — never part of CaveState, never
// read by the sim (FR-029). All units are grid cells (fractional allowed),
// so canvas.ts multiplies by its own cell pixel size when drawing.

export interface CameraPosition {
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

// Fraction of the viewport, centered, the player may move within before the
// camera follows. A tuning value deliberately left open for maintainer
// review (see spec Assumptions).
const DEAD_ZONE_FRACTION = 0.3;

function followAxis(
  playerCenter: number,
  prevOffset: number,
  viewportSize: number,
  caveSize: number
): number {
  if (caveSize <= viewportSize) {
    // Whole cave fits — center it and never scroll (FR-029 edge case).
    return (caveSize - viewportSize) / 2;
  }

  const deadZoneHalf = (viewportSize * DEAD_ZONE_FRACTION) / 2;
  const viewCenter = viewportSize / 2;
  const playerScreenPos = playerCenter - prevOffset;

  let offset = prevOffset;
  if (playerScreenPos < viewCenter - deadZoneHalf) {
    offset = playerCenter - (viewCenter - deadZoneHalf);
  } else if (playerScreenPos > viewCenter + deadZoneHalf) {
    offset = playerCenter - (viewCenter + deadZoneHalf);
  }

  // Clamp so the viewport never shows space outside the cave (FR-029).
  return Math.max(0, Math.min(offset, caveSize - viewportSize));
}

export function updateCamera(
  playerPos: Point,
  caveDims: Dimensions,
  viewportSize: Dimensions,
  prevCameraPos: CameraPosition
): CameraPosition {
  const playerCenterX = playerPos.x + 0.5;
  const playerCenterY = playerPos.y + 0.5;

  return {
    offsetX: followAxis(playerCenterX, prevCameraPos.offsetX, viewportSize.width, caveDims.width),
    offsetY: followAxis(playerCenterY, prevCameraPos.offsetY, viewportSize.height, caveDims.height),
  };
}
