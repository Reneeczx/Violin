/**
 * Audio engine using the Web Audio API.
 * This module is intentionally limited to audio scheduling and synthesis.
 */

const PITCH_MAP = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
};

class AudioEngine {
  constructor() {
    this._ctx = null;
    this._isPlaying = false;
    this._stopRequested = false;
    this._activeNodes = [];
    this._masterGain = null;
    this._scheduledTimers = [];
    this._referencePitch = null;
  }

  async ensureContext() {
    if (!this._ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioContextClass();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.6;
      this._masterGain.connect(this._ctx.destination);
    }

    if (this._ctx.state === 'suspended') {
      await this._ctx.resume();
    }

    return this._ctx;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get isReferenceTonePlaying() {
    return Boolean(this._referencePitch);
  }

  get referencePitch() {
    return this._referencePitch;
  }

  _scheduleTimer(callback, delayMs) {
    const timerId = window.setTimeout(() => {
      this._scheduledTimers = this._scheduledTimers.filter((id) => id !== timerId);
      callback();
    }, Math.max(0, delayMs));

    this._scheduledTimers.push(timerId);
    return timerId;
  }

  _clearScheduledTimers() {
    this._scheduledTimers.forEach((timerId) => window.clearTimeout(timerId));
    this._scheduledTimers = [];
  }

  _scheduleCleanup(ctx, nodes, cleanupAtTime) {
    const cleanupDelay = Math.max(0, (cleanupAtTime - ctx.currentTime) * 1000);
    window.setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.disconnect();
        } catch (_) {}
      });
      this._activeNodes = this._activeNodes.filter((node) => !nodes.includes(node));
    }, cleanupDelay);
  }

  _scheduleNote(ctx, freq, startTime, durationSec) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gain = ctx.createGain();
    const gain2 = ctx.createGain();

    const attack = 0.03;
    const decay = 0.1;
    const sustainLevel = 0.5;
    const release = 0.15;
    const sustainEnd = startTime + durationSec - release;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, Math.max(sustainEnd, startTime + attack + decay));
    gain.gain.linearRampToValueAtTime(0, startTime + durationSec);

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.08, startTime + attack);
    gain2.gain.linearRampToValueAtTime(0.04, startTime + attack + decay);
    gain2.gain.setValueAtTime(0.04, Math.max(sustainEnd, startTime + attack + decay));
    gain2.gain.linearRampToValueAtTime(0, startTime + durationSec);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc2.connect(gain2);
    gain2.connect(this._masterGain);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + durationSec + 0.01);

    this._activeNodes.push(osc, osc2, gain, gain2);
    this._scheduleCleanup(ctx, [osc, osc2, gain, gain2], startTime + durationSec + 0.1);
    return startTime + durationSec;
  }

  _startReferenceStack(ctx, freq, startTime) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gain = ctx.createGain();
    const gain2 = ctx.createGain();

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.04);
    gain.gain.linearRampToValueAtTime(0.42, startTime + 0.2);
    gain.gain.setValueAtTime(0.42, startTime + 3600);

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.08, startTime + 0.04);
    gain2.gain.linearRampToValueAtTime(0.05, startTime + 0.2);
    gain2.gain.setValueAtTime(0.05, startTime + 3600);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc2.connect(gain2);
    gain2.connect(this._masterGain);

    osc.start(startTime);
    osc2.start(startTime);

    this._activeNodes.push(osc, osc2, gain, gain2);
  }

  _reset() {
    this._stopRequested = true;
    this._isPlaying = false;
    this._referencePitch = null;
    this._clearScheduledTimers();

    if (this._ctx && this._masterGain) {
      const now = this._ctx.currentTime;
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(0, now);

      this._activeNodes.forEach((node) => {
        try {
          node.disconnect();
        } catch (_) {}
      });
      this._activeNodes = [];
      this._masterGain.gain.setValueAtTime(0.6, now + 0.005);
    }
  }

  async playNote(pitch, durationSec = 2) {
    const ctx = await this.ensureContext();
    const freq = PITCH_MAP[pitch];
    if (!freq) {
      return null;
    }

    this._reset();
    this._isPlaying = true;
    this._stopRequested = false;
    const endTime = this._scheduleNote(ctx, freq, ctx.currentTime + 0.02, durationSec);

    this._scheduleTimer(() => {
      if (!this._stopRequested) {
        this._isPlaying = false;
      }
    }, durationSec * 1000 + 50);

    return endTime;
  }

  async startReferenceTone(pitch) {
    const ctx = await this.ensureContext();
    const freq = PITCH_MAP[pitch];
    if (!freq) {
      return false;
    }

    this._reset();
    this._isPlaying = true;
    this._stopRequested = false;
    this._referencePitch = pitch;
    this._startReferenceStack(ctx, freq, ctx.currentTime + 0.02);
    return true;
  }

  stopReferenceTone() {
    if (this.isReferenceTonePlaying) {
      this.stop();
    }
  }

  scheduleMetronomeClick(time, isAccent) {
    if (!this._ctx) {
      return;
    }

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const duration = isAccent ? 0.05 : 0.03;
    const volume = isAccent ? 0.5 : 0.3;

    osc.type = 'sine';
    osc.frequency.value = isAccent ? 1000 : 800;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this._masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.01);

    this._activeNodes.push(osc, gain);
    this._scheduleCleanup(this._ctx, [osc, gain], time + duration + 0.1);
  }

  async playSequence(timeline, bpm, { startTime } = {}) {
    const ctx = await this.ensureContext();
    this._reset();

    this._isPlaying = true;
    this._stopRequested = false;

    const beatDuration = 60 / bpm;
    const scheduledStartTime = startTime ?? (ctx.currentTime + 0.05);
    let endTime = scheduledStartTime;

    timeline.forEach((event) => {
      if (this._stopRequested || event.isRest) {
        endTime = scheduledStartTime + event.endOffsetBeats * beatDuration;
        return;
      }

      const freq = PITCH_MAP[event.pitch];
      if (!freq) {
        endTime = scheduledStartTime + event.endOffsetBeats * beatDuration;
        return;
      }

      const noteStart = scheduledStartTime + event.startOffsetBeats * beatDuration;
      const noteDuration = event.beats * beatDuration * 0.9;
      endTime = Math.max(endTime, this._scheduleNote(ctx, freq, noteStart, noteDuration));
    });

    const playbackDurationMs = Math.max(0, (endTime - ctx.currentTime) * 1000 + 120);
    this._scheduleTimer(() => {
      if (!this._stopRequested) {
        this._isPlaying = false;
      }
    }, playbackDurationMs);

    return endTime;
  }

  stop() {
    const nodesToDisconnect = [...this._activeNodes];
    this._stopRequested = true;
    this._isPlaying = false;
    this._referencePitch = null;
    this._clearScheduledTimers();

    if (this._ctx && this._masterGain) {
      const now = this._ctx.currentTime;
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.linearRampToValueAtTime(0, now + 0.05);

      window.setTimeout(() => {
        nodesToDisconnect.forEach((node) => {
          try {
            node.disconnect();
          } catch (_) {}
        });
        this._activeNodes = this._activeNodes.filter((node) => !nodesToDisconnect.includes(node));

        if (this._masterGain && this._ctx) {
          this._masterGain.gain.setValueAtTime(0.6, this._ctx.currentTime);
        }
      }, 100);
    }
  }

  setVolume(vol) {
    if (this._masterGain) {
      this._masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }
}

const audioEngine = new AudioEngine();

if (typeof window !== 'undefined') {
  window.addEventListener('stop-audio', () => {
    audioEngine.stop();
  });
}

export default audioEngine;
