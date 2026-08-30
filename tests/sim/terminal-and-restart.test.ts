import { describe, expect, it } from 'vitest';
import { asciiFromState, caveFromAscii } from '../../src/sim/ascii';
import { getCollected, getStatus, parseCave, type CaveDefinition, type CaveState } from '../../src/sim/cave';
import { tick } from '../../src/sim/tick';
import { caveFromLines, runTicks } from './helpers/ascii-cave';

describe('terminal status freezes the cave (FR-028–FR-030)', () => {
  it('the dead state freezes the cave across further ticks — nothing falls, rolls, or moves', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S...S
      S.P.S
      SSSSS
    `);
    const dead = runTicks(state, 4); // FR-019: a crush blooms, then settles dead 2 ticks later
    expect(getStatus(dead)).toBe('dead');

    const before = asciiFromState(dead);
    const after = tick(dead, {});
    expect(getStatus(after)).toBe('dead');
    expect(asciiFromState(after)).toBe(before);
  });

  it('the completed state freezes the cave across further ticks — nothing falls, rolls, or moves', () => {
    const state = caveFromLines('S.P*XS', { quota: 1 });
    const completed = runTicks(state, 2, ['right', 'right']);
    expect(getStatus(completed)).toBe('completed');

    const before = asciiFromState(completed);
    const after = tick(completed, { direction: 'left' });
    expect(getStatus(after)).toBe('completed');
    expect(asciiFromState(after)).toBe(before);
  });

  it('becomes dead on the first tick with no explosion cell left, then freezes (FR-015.3, SC-016)', () => {
    const state = caveFromLines(`
      SSSSS
      S.o.S
      S...S
      S.P.S
      SSSSS
    `);

    const stillDying = runTicks(state, 3); // one tick short of full resolution
    expect(getStatus(stillDying)).toBe('dying');

    const dead = runTicks(state, 4); // the tick the last explosion cell converts
    expect(getStatus(dead)).toBe('dead');

    const before = asciiFromState(dead);
    const after = tick(dead, {});
    expect(getStatus(after)).toBe('dead');
    expect(asciiFromState(after)).toBe(before); // the resolved grid stays unchanged
  });
});

// Restart (FR-031–FR-032) is a shell-level rebuild — re-running parseCave on
// the same CaveDefinition — not a new sim entry point (research.md). These
// tests exercise that pattern directly against src/sim/, standing in for
// src/App.svelte's restart-key handler.
describe('restart rebuilds the cave from its definition (FR-031–FR-032)', () => {
  const def: CaveDefinition = caveFromAscii({
    name: 'restart-test',
    seed: 99,
    quota: 1,
    rows: ['SSSSSSSS', 'S.o.P..S', 'S......S', 'S.....*S', 'SSSSSSSS'],
  });

  const inputs = ['right', 'right', 'down', 'right', 'right', 'left', undefined, 'up'] as const;

  function replay(state: CaveState): CaveState {
    let next = state;
    for (const direction of inputs) {
      next = tick(next, { direction });
    }
    return next;
  }

  it('a restart mid-play replays identically to a fresh parse', () => {
    const original = parseCave(def);
    const midPlay = tick(tick(original, { direction: 'right' }), { direction: 'down' });
    expect(asciiFromState(midPlay)).not.toBe(asciiFromState(original)); // sanity: it really diverged

    // "Restart": rebuild from the same definition, discarding midPlay.
    const restarted = parseCave(def);

    const originalReplay = replay(original);
    const restartedReplay = replay(restarted);

    expect(asciiFromState(restartedReplay)).toBe(asciiFromState(originalReplay));
    expect(getCollected(restartedReplay)).toBe(getCollected(originalReplay));
    expect(getStatus(restartedReplay)).toBe(getStatus(originalReplay));
  });

  it('a restart during the dying state takes effect exactly as it does once dead (FR-015.4)', () => {
    const dyingCave = caveFromAscii({
      name: 'restart-dying-test',
      seed: 3,
      quota: 0,
      rows: ['SSSSS', 'S.o.S', 'S...S', 'S.P.S', 'SSSSS'],
    });

    const original = parseCave(dyingCave);
    const dying = tick(tick(original, {}), {}); // crush stamped — status is 'dying', not yet 'dead'
    expect(getStatus(dying)).toBe('dying');

    const restarted = parseCave(dyingCave);
    expect(getStatus(restarted)).toBe('inPlay');
    expect(asciiFromState(restarted)).toBe(asciiFromState(original));
  });

  it('a restart from the dead terminal state replays identically to a fresh parse', () => {
    const deadCave = caveFromAscii({
      name: 'restart-dead-test',
      seed: 7,
      quota: 0,
      rows: ['SSSSS', 'S.o.S', 'S...S', 'S.P.S', 'SSSSS'],
    });
    // FR-019: a crush blooms, then settles dead 2 ticks later — 4 ticks total.
    const tick4 = (s: CaveState): CaveState => tick(tick(tick(tick(s, {}), {}), {}), {});

    const original = parseCave(deadCave);
    const dead = tick4(original);
    expect(getStatus(dead)).toBe('dead');

    const restarted = parseCave(deadCave);
    expect(getStatus(restarted)).toBe('inPlay');
    expect(asciiFromState(restarted)).toBe(asciiFromState(original));

    const deadReplay = tick4(original);
    const restartedReplay = tick4(restarted);
    expect(asciiFromState(restartedReplay)).toBe(asciiFromState(deadReplay));
    expect(getStatus(restartedReplay)).toBe('dead');
  });

  it('a restart from the completed terminal state replays identically to a fresh parse', () => {
    const completedCave = caveFromAscii({
      name: 'restart-completed-test',
      seed: 5,
      quota: 1,
      rows: ['S.P*XS'],
    });
    const original = parseCave(completedCave);
    const completed = tick(tick(original, { direction: 'right' }), { direction: 'right' });
    expect(getStatus(completed)).toBe('completed');

    const restarted = parseCave(completedCave);
    expect(getStatus(restarted)).toBe('inPlay');
    expect(getCollected(restarted)).toBe(0);
    expect(asciiFromState(restarted)).toBe(asciiFromState(original));

    const completedReplay = tick(tick(original, { direction: 'right' }), { direction: 'right' });
    const restartedReplay = tick(tick(restarted, { direction: 'right' }), { direction: 'right' });
    expect(asciiFromState(restartedReplay)).toBe(asciiFromState(completedReplay));
    expect(getStatus(restartedReplay)).toBe('completed');
  });
});
