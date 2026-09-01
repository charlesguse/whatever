import { resolveAvailabilityAfterGesture, type AudioAvailability } from './availability';
import type { SoundEventId } from './events';
import type { SoundTable, VoiceSpec } from '../themes/types';

// Impure, no unit test (Principle VII — no AudioContext in node); verified
// by the maintainer against spec.md's "What the maintainer listens for"
// checklist.
export interface AudioEngine {
  unlock(): void;
  play(events: readonly SoundEventId[], sounds: SoundTable, muted: boolean): void;
}

function scheduleVoice(context: AudioContext, voice: VoiceSpec): void {
  try {
    const now = context.currentTime;
    const durationSec = voice.durationMs / 1000;
    const attackSec = voice.attackMs / 1000;
    const releaseSec = voice.releaseMs / 1000;

    const master = context.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(voice.level, now + attackSec);
    master.gain.setValueAtTime(voice.level, now + Math.max(attackSec, durationSec - releaseSec));
    master.gain.linearRampToValueAtTime(0, now + durationSec);
    master.connect(context.destination);

    if (voice.noiseMix > 0) {
      const sampleCount = Math.max(1, Math.floor(context.sampleRate * durationSec));
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = context.createBufferSource();
      noiseSource.buffer = buffer;
      const noiseGain = context.createGain();
      noiseGain.gain.value = voice.noiseMix;
      noiseSource.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start(now);
      noiseSource.stop(now + durationSec);
    }

    if (voice.noiseMix < 1) {
      const oscillator = context.createOscillator();
      oscillator.type = voice.waveform === 'noise' ? 'sine' : voice.waveform;
      oscillator.frequency.setValueAtTime(voice.frequencyHz, now);
      if (voice.frequencyEndHz !== undefined) {
        oscillator.frequency.linearRampToValueAtTime(voice.frequencyEndHz, now + durationSec);
      }
      const oscillatorGain = context.createGain();
      oscillatorGain.gain.value = 1 - voice.noiseMix;
      oscillator.connect(oscillatorGain);
      oscillatorGain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + durationSec);
    }
  } catch {
    // FR-018: every scheduling failure is swallowed — nothing thrown,
    // logged, or shown to the player.
  }
}

// FR-016, FR-017, FR-018, FR-029, FR-043: device creation is lazy and
// gesture-scoped, vendor-prefix-tolerant, and every failure mode is
// silently swallowed.
export function createAudioEngine(): AudioEngine {
  let availability: AudioAvailability = 'notCreated';
  let unlockStarted = false;
  let context: AudioContext | undefined;

  function unlock(): void {
    // Idempotent — a no-op once a first attempt has started, including
    // while its resume() promise is still pending (FR-016).
    if (unlockStarted) return;
    unlockStarted = true;

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        availability = resolveAvailabilityAfterGesture('noConstructor');
        return;
      }

      const ctx = new Ctor();
      context = ctx;
      ctx.resume().then(
        () => {
          availability = resolveAvailabilityAfterGesture(ctx.state === 'running' ? 'healthy' : 'staysSuspended');
        },
        () => {
          availability = resolveAvailabilityAfterGesture('resumeRejects');
        }
      );
    } catch {
      availability = resolveAvailabilityAfterGesture('throws');
    }
  }

  function play(events: readonly SoundEventId[], sounds: SoundTable, muted: boolean): void {
    // No node allocation at all when muted or unavailable (FR-018, FR-029).
    if (muted || availability !== 'available' || !context) return;
    for (const id of events) {
      scheduleVoice(context, sounds[id]);
    }
  }

  return { unlock, play };
}
