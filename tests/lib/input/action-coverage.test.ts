import { describe, expect, it } from 'vitest';
import {
  CYCLE_THEME_KEYS,
  GRAB_KEYS,
  KEY_TO_DIRECTION,
  KeyboardInput,
  PAUSE_KEYS,
  RESTART_KEYS,
  START_KEYS,
} from '../../../src/lib/input/keyboard';
import { TouchInput } from '../../../src/lib/input/touch/TouchInput';
import { GamepadInput } from '../../../src/lib/input/gamepad/GamepadInput';

const NAMED_ACTIONS = [
  'consumeDirection',
  'consumeGrab',
  'consumeRestart',
  'consumeStart',
  'consumePause',
  'consumeCycleTheme',
] as const;

describe('KeyboardInput declares all six named actions, each backed by a non-empty key table (SC-012)', () => {
  it('every named action method exists', () => {
    const keyboard = new KeyboardInput();
    for (const action of NAMED_ACTIONS) {
      expect(typeof (keyboard as unknown as Record<string, unknown>)[action]).toBe('function');
    }
  });

  it('every key table backing those actions is non-empty', () => {
    expect(Object.keys(KEY_TO_DIRECTION).length).toBeGreaterThan(0);
    expect(GRAB_KEYS.size).toBeGreaterThan(0);
    expect(RESTART_KEYS.size).toBeGreaterThan(0);
    expect(START_KEYS.size).toBeGreaterThan(0);
    expect(PAUSE_KEYS.size).toBeGreaterThan(0);
    expect(CYCLE_THEME_KEYS.size).toBeGreaterThan(0);
  });
});

describe("touch's cycle-theme route is the existing theme-picker tap, not a new control", () => {
  it('TouchInput.consumeCycleTheme() always returns false', () => {
    const touch = new TouchInput();
    expect(touch.consumeCycleTheme()).toBe(false);
    expect(touch.consumeCycleTheme()).toBe(false);
  });

  it('TouchInput has no consumeConfirm()', () => {
    const touch = new TouchInput();
    expect((touch as unknown as Record<string, unknown>).consumeConfirm).toBeUndefined();
  });
});

describe("gamepad's confirm route is the edge-triggered consumeConfirm(), not consumeStart()", () => {
  it('GamepadInput has no consumeStart()', () => {
    const gamepad = new GamepadInput();
    expect((gamepad as unknown as Record<string, unknown>).consumeStart).toBeUndefined();
  });
});

describe('nothing declared by touch or gamepad reaches an action keyboard does not also cover (FR-035)', () => {
  // gamepad's consumeConfirm() fills the same role as keyboard/touch's
  // consumeStart() (research.md's dual-read decision) — a different method
  // name for the identical named action, not an extra one.
  const roleAliases: Record<string, string> = { consumeConfirm: 'consumeStart' };

  function assertEveryConsumeMethodIsCoveredByKeyboard(instance: object, keyboard: KeyboardInput): void {
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter((name) => name.startsWith('consume'));
    expect(methodNames.length).toBeGreaterThan(0);
    for (const name of methodNames) {
      const keyboardName = roleAliases[name] ?? name;
      expect(typeof (keyboard as unknown as Record<string, unknown>)[keyboardName]).toBe('function');
    }
  }

  it('every TouchInput consume*() method has a keyboard counterpart', () => {
    assertEveryConsumeMethodIsCoveredByKeyboard(new TouchInput(), new KeyboardInput());
  });

  it('every GamepadInput consume*() method has a keyboard counterpart', () => {
    assertEveryConsumeMethodIsCoveredByKeyboard(new GamepadInput(), new KeyboardInput());
  });
});
