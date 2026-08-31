import { describe, expect, it } from 'vitest';
import { CAVES } from '../../src/caves';
import { CHAR_TO_ELEMENT } from '../../src/sim/elements';
import { checkReachability } from '../../src/sim/reachability';
import { getStatus, parseCave } from '../../src/sim/cave';
import { tick } from '../../src/sim/tick';

// FR-034/FR-035/SC-010: every shipped cave parses, is structurally sound,
// and clears the conservative quota-reachability check. No browser.

const NO_INPUT_TICKS = 10;

describe('CAVES (FR-031, FR-032)', () => {
  it('ships exactly eight caves', () => {
    expect(CAVES.length).toBe(8);
  });

  it.each(CAVES.map((def, index) => ({ def, index })))(
    'cave $index ("$def.name") is structurally sound',
    ({ def }) => {
      // Parses without throwing.
      const state = parseCave(def);
      expect(state.status).toBe('inPlay');

      // Exactly one player.
      let playerCount = 0;
      let exitCount = 0;
      for (const row of def.rows) {
        for (const char of row) {
          const id = CHAR_TO_ELEMENT[char];
          if (id === 'player') playerCount++;
          if (id === 'exit') exitCount++;
        }
      }
      expect(playerCount).toBe(1);
      expect(exitCount).toBe(1);

      // Enclosed by an indestructible steel border on all four sides.
      const { width, height, rows } = def;
      for (let x = 0; x < width; x++) {
        expect(rows[0][x]).toBe('S');
        expect(rows[height - 1][x]).toBe('S');
      }
      for (let y = 0; y < height; y++) {
        expect(rows[y][0]).toBe('S');
        expect(rows[y][width - 1]).toBe('S');
      }

      // Nothing capable of killing the kid on tick zero or the immediately
      // following few ticks, with no input at all.
      let running = state;
      for (let i = 0; i < NO_INPUT_TICKS; i++) {
        running = tick(running, {});
        expect(getStatus(running)).toBe('inPlay');
      }

      // Quota is attainable from the layout (FR-035).
      const reachability = checkReachability(def);
      expect(reachability.attainable).toBe(true);
    }
  );
});
