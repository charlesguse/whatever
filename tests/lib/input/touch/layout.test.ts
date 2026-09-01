import { describe, expect, it } from 'vitest';
import {
  computeOrientation,
  computeTouchControlLayout,
  resolveTouchPoint,
  type InsetBox,
  type Rect,
} from '../../../../src/lib/input/touch/layout';

// Representative modern-device inset boxes (logical CSS px), both
// orientations — not adversarially tiny, matching plan.md's "any modern
// browser" target.
const SAMPLE_INSET_BOXES: InsetBox[] = [
  { x: 0, y: 0, width: 375, height: 667 },
  { x: 0, y: 0, width: 667, height: 375 },
  { x: 0, y: 0, width: 390, height: 844 },
  { x: 0, y: 0, width: 844, height: 390 },
  { x: 0, y: 0, width: 768, height: 1024 },
  { x: 0, y: 0, width: 1024, height: 768 },
  { x: 0, y: 0, width: 834, height: 1194 },
  { x: 0, y: 0, width: 1194, height: 834 },
  { x: 24, y: 12, width: 812, height: 375 }, // notch-style non-zero inset origin
];

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function rectFullyInside(rect: Rect, box: InsetBox): boolean {
  return (
    rect.x >= box.x - 1e-9 &&
    rect.y >= box.y - 1e-9 &&
    rect.x + rect.width <= box.x + box.width + 1e-9 &&
    rect.y + rect.height <= box.y + box.height + 1e-9
  );
}

describe('computeOrientation', () => {
  it("returns 'portrait' when height >= width, else 'landscape'", () => {
    expect(computeOrientation({ x: 0, y: 0, width: 300, height: 300 })).toBe('portrait');
    expect(computeOrientation({ x: 0, y: 0, width: 300, height: 400 })).toBe('portrait');
    expect(computeOrientation({ x: 0, y: 0, width: 400, height: 300 })).toBe('landscape');
  });
});

describe('computeTouchControlLayout — geometry invariants (SC-011, SC-011a, FR-009, FR-031a)', () => {
  for (const insetBox of SAMPLE_INSET_BOXES) {
    const orientation = computeOrientation(insetBox);

    it(`reservedRects and caveRect never intersect (${orientation}, ${insetBox.width}x${insetBox.height})`, () => {
      const layout = computeTouchControlLayout(insetBox, orientation);
      for (const reservedRect of layout.reservedRects) {
        expect(rectsIntersect(reservedRect, layout.caveRect)).toBe(false);
      }
    });

    it(`reservedRects and caveRect stay fully inside insetBox (${orientation}, ${insetBox.width}x${insetBox.height})`, () => {
      const layout = computeTouchControlLayout(insetBox, orientation);
      for (const reservedRect of layout.reservedRects) {
        expect(rectFullyInside(reservedRect, insetBox)).toBe(true);
      }
      expect(rectFullyInside(layout.caveRect, insetBox)).toBe(true);
    });

    it(`every pad zone and the grab button are at least 64 CSS px in both dimensions (${orientation}, ${insetBox.width}x${insetBox.height})`, () => {
      const layout = computeTouchControlLayout(insetBox, orientation);
      for (const zone of layout.pad.zones) {
        expect(zone.rect.width).toBeGreaterThanOrEqual(64);
        expect(zone.rect.height).toBeGreaterThanOrEqual(64);
      }
      expect(layout.grabButton.width).toBeGreaterThanOrEqual(64);
      expect(layout.grabButton.height).toBeGreaterThanOrEqual(64);
    });

    it(`pause and restart are at least 44 CSS px in both dimensions (${orientation}, ${insetBox.width}x${insetBox.height})`, () => {
      const layout = computeTouchControlLayout(insetBox, orientation);
      expect(layout.pauseButton.width).toBeGreaterThanOrEqual(44);
      expect(layout.pauseButton.height).toBeGreaterThanOrEqual(44);
      expect(layout.restartButton.width).toBeGreaterThanOrEqual(44);
      expect(layout.restartButton.height).toBeGreaterThanOrEqual(44);
    });

    it(`every control rect stays fully inside insetBox (${orientation}, ${insetBox.width}x${insetBox.height})`, () => {
      const layout = computeTouchControlLayout(insetBox, orientation);
      expect(rectFullyInside(layout.grabButton, insetBox)).toBe(true);
      expect(rectFullyInside(layout.pauseButton, insetBox)).toBe(true);
      expect(rectFullyInside(layout.restartButton, insetBox)).toBe(true);
    });
  }

  it('both orientations produce a distinct shape (band-at-bottom vs. two margins-at-sides), per FR-031', () => {
    const box: InsetBox = { x: 0, y: 0, width: 800, height: 800 };
    const portrait = computeTouchControlLayout(box, 'portrait');
    const landscape = computeTouchControlLayout(box, 'landscape');
    // Portrait's reserved band is a single rect spanning the full width;
    // landscape's is two rects, each spanning the full height — the two
    // orientations are not the same rectangle shape.
    expect(portrait.reservedRects).toHaveLength(1);
    expect(portrait.reservedRects[0].width).toBe(box.width);
    expect(landscape.reservedRects).toHaveLength(2);
    for (const reservedRect of landscape.reservedRects) {
      expect(reservedRect.height).toBe(box.height);
    }
  });

  it('landscape splits the reserved area into two margins, one per thumb (FR-031, issue #7)', () => {
    for (const insetBox of SAMPLE_INSET_BOXES) {
      if (computeOrientation(insetBox) !== 'landscape') continue;
      const layout = computeTouchControlLayout(insetBox, 'landscape');
      const midpointX = layout.caveRect.x + layout.caveRect.width / 2;
      const padCenterX = layout.pad.center.x;
      const grabCenterX = layout.grabButton.x + layout.grabButton.width / 2;
      // The pad and the grab button sit on opposite sides of the cave's
      // horizontal midpoint — a future tuning pass cannot silently collapse
      // this back into a single one-thumb band.
      expect(padCenterX).toBeLessThan(midpointX);
      expect(grabCenterX).toBeGreaterThan(midpointX);
    }
  });
});

describe('resolveTouchPoint — resolution order (buttons, then pad, then none)', () => {
  const insetBox: InsetBox = { x: 0, y: 0, width: 390, height: 844 };
  const layout = computeTouchControlLayout(insetBox, computeOrientation(insetBox));

  it('a point inside grabButton wins over the pad, even near the pad outer radius', () => {
    const { x, y } = layout.grabButton;
    const hit = resolveTouchPoint(layout, x + layout.grabButton.width / 2, y + layout.grabButton.height / 2);
    expect(hit).toEqual({ kind: 'grab' });
  });

  it('a point inside pauseButton resolves pause', () => {
    const { x, y, width, height } = layout.pauseButton;
    expect(resolveTouchPoint(layout, x + width / 2, y + height / 2)).toEqual({ kind: 'pause' });
  });

  it('a point inside restartButton resolves restart', () => {
    const { x, y, width, height } = layout.restartButton;
    expect(resolveTouchPoint(layout, x + width / 2, y + height / 2)).toEqual({ kind: 'restart' });
  });

  it('inside the dead radius resolves { kind: "pad", direction: undefined }', () => {
    const { center } = layout.pad;
    expect(resolveTouchPoint(layout, center.x, center.y)).toEqual({ kind: 'pad', direction: undefined });
  });

  it('inside the pad but outside the dead radius resolves a zone via resolveDominantAxis', () => {
    const { center, outerRadius } = layout.pad;
    const edge = outerRadius - 1;
    expect(resolveTouchPoint(layout, center.x, center.y - edge)).toEqual({ kind: 'pad', direction: 'up' });
    expect(resolveTouchPoint(layout, center.x, center.y + edge)).toEqual({ kind: 'pad', direction: 'down' });
    expect(resolveTouchPoint(layout, center.x - edge, center.y)).toEqual({ kind: 'pad', direction: 'left' });
    expect(resolveTouchPoint(layout, center.x + edge, center.y)).toEqual({ kind: 'pad', direction: 'right' });
  });

  it('outside the outer radius resolves { kind: "none" }', () => {
    const { center, outerRadius } = layout.pad;
    expect(resolveTouchPoint(layout, center.x, center.y - outerRadius - 5)).toEqual({ kind: 'none' });
  });

  it('a point entirely outside every control resolves none', () => {
    expect(resolveTouchPoint(layout, layout.caveRect.x + 5, layout.caveRect.y + 5)).toEqual({ kind: 'none' });
  });
});
