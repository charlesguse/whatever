import { getCell, getPlayerPosition, isDoorOpen, type CaveState } from '../../sim/cave';
import type { ElementId } from '../../sim/elements';
import { getTheme } from '../themes/registry';
import type { Theme, ThemeEntry } from '../themes/types';
import { updateCamera, type CameraPosition } from './camera';

// Cells visible along the canvas width, at most — a tuning value left open
// for maintainer review, like the camera dead zone.
const TARGET_VISIBLE_CELLS = 24;

// The door-flash cadence (FR-039): driven entirely by the render loop's own
// frame timer, never by tick count or CaveState — a tuning value left open
// for maintainer review, like the camera dead zone.
const DOOR_FLASH_INTERVAL_MS = 400;

export interface RenderLoopOptions {
  readonly canvas: HTMLCanvasElement;
  readonly getState: () => CaveState;
  readonly getThemeId: () => string;
}

export interface RenderLoop {
  start(): void;
  stop(): void;
}

// Text color with enough contrast against an arbitrary fill color — a
// generic legibility rule, not a per-element or per-theme literal.
function contrastingTextColor(fillColor: string): string {
  const hex = fillColor.replace('#', '');
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

// The door's appearance: closed (elements.exit, identical to steelWall) or,
// once open, alternating with doorOpenEntry on the render loop's own frame
// timer — every other element resolves through elements as usual.
function resolveEntry(
  theme: Theme,
  elementId: ElementId,
  doorOpen: boolean,
  flashOpenFace: boolean
): ThemeEntry {
  if (elementId === 'exit' && doorOpen && flashOpenFace) {
    return theme.doorOpenEntry;
  }
  return theme.elements[elementId];
}

function computeViewportCells(
  widthPx: number,
  heightPx: number,
  caveWidth: number
): { cellSize: number; viewportWidthCells: number; viewportHeightCells: number } {
  const visibleColumns = Math.min(caveWidth, TARGET_VISIBLE_CELLS);
  const cellSize = widthPx / visibleColumns;
  return {
    cellSize,
    viewportWidthCells: widthPx / cellSize,
    viewportHeightCells: heightPx / cellSize,
  };
}

// The canvas render loop (FR-023, FR-024, FR-030): its own requestAnimationFrame
// loop, entirely independent of the sim's tick loop. Reads sim state only
// through getCell/getPlayerPosition/state.width/state.height (FR-005) and
// looks up every color/glyph/label from the active theme via the registry —
// no literal color/glyph/label and no branching on which theme is active.
// Owns the camera's frame-to-frame position, recomputed each frame via the
// pure updateCamera function (FR-029) — the camera never feeds back into
// the sim.
export function createRenderLoop(options: RenderLoopOptions): RenderLoop {
  const maybeCtx = options.canvas.getContext('2d');
  if (!maybeCtx) {
    throw new Error('2D canvas context unavailable');
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let frameHandle: number | undefined;
  let cameraPos: CameraPosition = { offsetX: 0, offsetY: 0 };

  function drawFrame(): void {
    const canvas = options.canvas;
    const state = options.getState();
    const theme = getTheme(options.getThemeId());

    const dpr = window.devicePixelRatio || 1;
    const widthPx = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    const desiredWidth = Math.round(widthPx * dpr);
    const desiredHeight = Math.round(heightPx * dpr);
    if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const { cellSize, viewportWidthCells, viewportHeightCells } = computeViewportCells(
      widthPx,
      heightPx,
      state.width
    );

    cameraPos = updateCamera(
      getPlayerPosition(state),
      { width: state.width, height: state.height },
      { width: viewportWidthCells, height: viewportHeightCells },
      cameraPos
    );

    const firstX = Math.max(0, Math.floor(cameraPos.offsetX));
    const firstY = Math.max(0, Math.floor(cameraPos.offsetY));
    const lastX = Math.min(state.width - 1, Math.ceil(cameraPos.offsetX + viewportWidthCells));
    const lastY = Math.min(state.height - 1, Math.ceil(cameraPos.offsetY + viewportHeightCells));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`;

    // FR-039: the flash phase comes from this frame's own timestamp, never
    // from tick count or CaveState.
    const doorOpen = isDoorOpen(state);
    const flashOpenFace = Math.floor(performance.now() / DOOR_FLASH_INTERVAL_MS) % 2 === 0;

    for (let y = firstY; y <= lastY; y++) {
      for (let x = firstX; x <= lastX; x++) {
        const elementId = getCell(state, x, y);
        const entry = resolveEntry(theme, elementId, doorOpen, flashOpenFace);
        const screenX = (x - cameraPos.offsetX) * cellSize;
        const screenY = (y - cameraPos.offsetY) * cellSize;

        ctx.fillStyle = entry.fillColor;
        ctx.fillRect(screenX, screenY, cellSize, cellSize);

        if (entry.glyph) {
          ctx.fillStyle = contrastingTextColor(entry.fillColor);
          ctx.fillText(entry.glyph, screenX + cellSize / 2, screenY + cellSize / 2 + 1);
        }
      }
    }
  }

  function loop(): void {
    drawFrame();
    frameHandle = requestAnimationFrame(loop);
  }

  return {
    start(): void {
      if (frameHandle !== undefined) return;
      frameHandle = requestAnimationFrame(loop);
    },
    stop(): void {
      if (frameHandle !== undefined) {
        cancelAnimationFrame(frameHandle);
        frameHandle = undefined;
      }
    },
  };
}
