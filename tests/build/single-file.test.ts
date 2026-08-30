import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// FR-043, SC-008: the build emits exactly one self-contained dist/index.html
// with all JS/CSS inlined — no sibling script, style, image, font, or audio
// file referenced at play time. Run `npm run build` before `npm test` (the
// merge gate runs both together, per tasks.md Phase 7).
const distDir = resolve(__dirname, '../../dist');
const distIndex = resolve(distDir, 'index.html');

describe('single-file build output', () => {
  it('produces dist/index.html', () => {
    expect(existsSync(distIndex), 'dist/index.html not found — run `npm run build` first').toBe(true);
  });

  it('is the only play-time file in dist/', () => {
    const entries = readdirSync(distDir);
    expect(entries).toEqual(['index.html']);
  });

  it('has no external script, style, or other network-dependent resource reference', () => {
    const html = readFileSync(distIndex, 'utf-8');

    const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc=/gi)];
    expect(scriptSrcs).toHaveLength(0);

    const linkHrefs = [...html.matchAll(/<link[^>]*\shref=/gi)];
    expect(linkHrefs).toHaveLength(0);

    const externalRefs = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\//gi)];
    expect(externalRefs).toHaveLength(0);
  });
});
