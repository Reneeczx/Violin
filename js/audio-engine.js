/**
 * Audio engine using Web Audio API.
 * Generates reference tones and plays note sequences.
 * Safari/iPad compatible.
 */
import EventBus from './event-bus.js';

const PITCH_MAP = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
  'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'G5': 783.99, 'A5': 880.00,
};

const DURATION_BEATS = {
  'whole': 4,
  'half': 2,
  'quarter': 1,
  'eighth': 0.5,
  'sixteenth': 0.25,
};

class AudioEngine {
  constructor() {
    this._ctx = null;
    this._isPlaying = false;
    this._stopRequested = false;
    this._activeNodes = [];
    this._masterGain = null;
  }

  /** Must be called from a user gesture (click/tap) */
  async ensureContext() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AC();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.6;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') {
      await this._ctx.resume();
    }
    return this._ctx;
  }

  get isPlaying() { return this._isPlaying; }

  /**
   * Play a single note with ADSR envelope.
   * Returns the scheduled end time.
   */
  _scheduleNote(ctx, freq, startTime, durationSec) {
    // Main tone: triangle wave (warmer than sine, less harsh than sawtooth)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Subtle overtone for richness
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2; // octave

    const gain = ctx.createGain();
    const gain2 = ctx.createGain();

    // ADSR envelope
    const attack = 0.03;
    const decay = 0.1;
    const sustainLevel = 0.5;
    const release = 0.15;

    const sustainEnd = startTime + durationSec - release;

    // Main tone envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, Math.max(sustainEnd, startTime + attack + decay));
    gain.gain.linearRampToValueAtTime(0, startTime + durationSec);

    // Overtone (quieter)
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

    // Cleanup after done
    const cleanupTime = (startTime + durationSec + 0.1 - ctx.currentTime) * 1000;
    setTimeout(() => {
      try {
        osc.disconnect();
        osc2.disconnect();
        gain.disconnect();
        gain2.disconnect();
      } catch (_) {}
    }, Math.max(0, cleanupTime));

    return startTime + durationSec;
  }

  /**
   * Play a single reference pitch for the given duration.
   */
  async playNote(pitch, durationSec = 2) {
    const ctx = await this.ensureContext();
    const freq = PITCH_MAP[pitch];
    if (!freq) return;

    this.stop();
    this._isPlaying = true;
    this._scheduleNote(ctx, freq, ctx.currentTime + 0.02, durationSec);

    setTimeout(() => {
      this._isPlaying = false;
      EventBus.emit('audio:stop');
    }, durationSec * 1000 + 50);
  }

  /**
   * Play a sequence of notes (measures) at given BPM.
   * Calls onNoteStart(index, note) and onNoteEnd(index, note) for visual sync.
   */
  async playSequence(measures, bpm, { speedFactor = 1, onNoteStart, onNoteEnd } = {}) {
    const ctx = await this.ensureContext();
    this.stop();

    this._isPlaying = true;
    this._stopRequested = false;

    const effectiveBpm = bpm * speedFactor;
    const beatDuration = 60 / effectiveBpm;

    let currentTime = ctx.currentTime + 0.05;
    let noteIndex = 0;

    for (const measure of measures) {
      for (const note of measure.notes) {
        if (this._stopRequested) {
          this._isPlaying = false;
          return;
        }

        const beats = DURATION_BEATS[note.duration] || 1;
        const durationSec = beats * beatDuration;
        const idx = noteIndex;

        if (note.pitch !== 'REST') {
          const freq = PITCH_MAP[note.pitch];
          if (freq) {
            this._scheduleNote(ctx, freq, currentTime, durationSec * 0.9);
          }
        }

        // Schedule visual highlight via setTimeout
        const delay = (currentTime - ctx.currentTime) * 1000;
        setTimeout(() => onNoteStart?.(idx, note), Math.max(0, delay));
        setTimeout(() => onNoteEnd?.(idx, note), Math.max(0, delay + durationSec * 1000));

        currentTime += durationSec;
        noteIndex++;
      }
    }

    // Signal playback end
    const totalDelay = (currentTime - ctx.currentTime) * 1000;
    setTimeout(() => {
      this._isPlaying = false;
      EventBus.emit('audio:stop');
    }, Math.max(0, totalDelay));
  }

  /** Stop all playback */
  stop() {
    this._stopRequested = true;
    this._isPlaying = false;

    // Fade out and disconnect active nodes
    if (this._ctx && this._masterGain) {
      const now = this._ctx.currentTime;
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.linearRampToValueAtTime(0, now + 0.05);

      setTimeout(() => {
        this._activeNodes.forEach(node => {
          try { node.disconnect(); } catch (_) {}
        });
        this._activeNodes = [];
        if (this._masterGain) {
          this._masterGain.gain.setValueAtTime(0.6, this._ctx.currentTime);
        }
      }, 100);
    }

    EventBus.emit('audio:stop');
  }

  /** Set master volume (0-1) */
  setVolume(vol) {
    if (this._masterGain) {
      this._masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }
}

// Singleton
const audioEngine = new AudioEngine();

// Listen for play-string events from tuner view
window.addEventListener('play-string', (e) => {
  const { pitch } = e.detail;
  audioEngine.playNote(pitch, 2);
});

window.addEventListener('stop-audio', () => {
  audioEngine.stop();
});

export default audioEngine;
