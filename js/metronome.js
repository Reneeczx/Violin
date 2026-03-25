/**
 * Precise metronome using Web Audio API look-ahead scheduling.
 */
import EventBus from './event-bus.js';
import audioEngine from './audio-engine.js';

class Metronome {
  constructor() {
    this._running = false;
    this._bpm = 80;
    this._beatsPerMeasure = 4;
    this._currentBeat = 0;
    this._nextBeatTime = 0;
    this._intervalId = null;

    // Look-ahead config
    this._scheduleAheadTime = 0.1;  // seconds
    this._lookAheadMs = 25;          // milliseconds
  }

  get running() { return this._running; }
  get bpm() { return this._bpm; }
  get beatsPerMeasure() { return this._beatsPerMeasure; }

  setBpm(bpm) {
    this._bpm = Math.max(30, Math.min(240, bpm));
  }

  setTimeSignature(beats) {
    this._beatsPerMeasure = beats;
  }

  async start(bpm, beatsPerMeasure = 4) {
    if (this._running) this.stop();

    const ctx = await audioEngine.ensureContext();
    this._bpm = bpm || this._bpm;
    this._beatsPerMeasure = beatsPerMeasure;
    this._currentBeat = 0;
    this._running = true;
    this._nextBeatTime = ctx.currentTime + 0.05;

    this._intervalId = setInterval(() => this._schedule(ctx), this._lookAheadMs);
    EventBus.emit('metronome:start', { bpm: this._bpm });
  }

  stop() {
    this._running = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._currentBeat = 0;
    EventBus.emit('metronome:stop');
  }

  toggle(bpm, beatsPerMeasure) {
    if (this._running) {
      this.stop();
    } else {
      this.start(bpm, beatsPerMeasure);
    }
  }

  _schedule(ctx) {
    while (this._nextBeatTime < ctx.currentTime + this._scheduleAheadTime) {
      this._playClick(ctx, this._nextBeatTime, this._currentBeat === 0);
      this._emitBeat(this._currentBeat, this._nextBeatTime - ctx.currentTime);

      // Advance
      const beatDuration = 60 / this._bpm;
      this._nextBeatTime += beatDuration;
      this._currentBeat = (this._currentBeat + 1) % this._beatsPerMeasure;
    }
  }

  _playClick(ctx, time, isAccent) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = isAccent ? 1000 : 800;

    const duration = isAccent ? 0.05 : 0.03;
    const volume = isAccent ? 0.5 : 0.3;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination); // bypass master gain

    osc.start(time);
    osc.stop(time + duration + 0.01);

    // Cleanup
    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch (_) {}
    }, (time - ctx.currentTime + duration + 0.1) * 1000);
  }

  _emitBeat(beatIndex, delaySeconds) {
    const delay = Math.max(0, delaySeconds * 1000);
    setTimeout(() => {
      if (this._running) {
        EventBus.emit('metronome:beat', {
          beat: beatIndex,
          isAccent: beatIndex === 0,
          total: this._beatsPerMeasure
        });
      }
    }, delay);
  }
}

export default new Metronome();
