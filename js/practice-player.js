import EventBus from './event-bus.js';
import audioEngine from './audio-engine.js';
import { reducePracticePlayerState, createInitialPracticePlayerState } from './practice-player-state.js';
import { buildPlaybackTimeline } from './score-utils.js';

function getDefaultTimerApi() {
  const root = globalThis.window || globalThis;
  return {
    setTimeout: root.setTimeout.bind(root),
    clearTimeout: root.clearTimeout.bind(root),
    setInterval: root.setInterval.bind(root),
    clearInterval: root.clearInterval.bind(root),
  };
}

class PracticePlayer {
  constructor({
    audio = audioEngine,
    bus = EventBus,
    timerApi = getDefaultTimerApi(),
  } = {}) {
    this._audio = audio;
    this._bus = bus;
    this._timers = timerApi;
    this._state = createInitialPracticePlayerState();
    this._ctx = null;
    this._timeline = null;
    this._intervalId = null;
    this._eventTimers = [];
    this._demoEndTimer = null;
    this._startTime = 0;
    this._nextBeatTime = 0;
    this._globalBeat = 0;
    this._scheduleAheadTime = 0.1;
    this._lookAheadMs = 25;
    this._sessionToken = 0;
  }

  get state() {
    return {
      ...this._state,
      running: this.running,
    };
  }

  get running() {
    return this._state.mode !== 'idle';
  }

  isSectionActive(sectionId) {
    return this.running && this._state.sectionId === sectionId;
  }

  isDemoPlaying(sectionId) {
    return this._state.mode === 'demo' && this._state.sectionId === sectionId;
  }

  isClickOnly(sectionId) {
    return this._state.mode === 'click' && this._state.sectionId === sectionId;
  }

  isReferencePlaying(sectionId, pitch = null) {
    return this._state.mode === 'reference'
      && this._state.sectionId === sectionId
      && (pitch == null || this._state.pitch === pitch);
  }

  async startReference({ sectionId, pitch }) {
    this._stopSession({ emitStateChange: false, stopAudio: this.running });
    const sessionToken = this._openSession();

    const started = await this._audio.startReferenceTone(pitch);
    if (!started || sessionToken !== this._sessionToken) {
      return this.state;
    }

    this._state = reducePracticePlayerState(this._state, {
      type: 'START_REFERENCE',
      sectionId,
      pitch,
    });
    this._emitStateChange();
    return this.state;
  }

  async startClick({ sectionId, bpm, speedFactor = 1, beatsPerMeasure = 4 }) {
    const ctx = await this._audio.ensureContext();
    this._stopSession({ emitStateChange: false, stopAudio: this.running });
    const sessionToken = this._openSession();

    const effectiveBpm = bpm * speedFactor;
    this._ctx = ctx;
    this._state = reducePracticePlayerState(this._state, {
      type: 'START_CLICK',
      sectionId,
      bpm: effectiveBpm,
      beatsPerMeasure,
    });
    this._startTime = ctx.currentTime + 0.08;
    this._nextBeatTime = this._startTime;
    this._globalBeat = 0;
    this._timeline = null;

    this._startClockLoop(sessionToken);
    this._emitStateChange();
    return this.state;
  }

  async startDemo({
    sectionId,
    measures,
    bpm,
    speedFactor = 1,
    beatsPerMeasure = 4,
  }) {
    const ctx = await this._audio.ensureContext();
    this._stopSession({ emitStateChange: false, stopAudio: this.running });
    const sessionToken = this._openSession();

    const effectiveBpm = bpm * speedFactor;
    const timeline = buildPlaybackTimeline(measures, { beatsPerMeasure });

    this._ctx = ctx;
    this._timeline = timeline;
    this._state = reducePracticePlayerState(this._state, {
      type: 'START_DEMO',
      sectionId,
      bpm: effectiveBpm,
      beatsPerMeasure,
    });
    this._startTime = ctx.currentTime + 0.08;
    this._nextBeatTime = this._startTime;
    this._globalBeat = 0;

    await this._audio.playSequence(timeline.events, effectiveBpm, {
      startTime: this._startTime,
    });

    if (sessionToken !== this._sessionToken) {
      return this.state;
    }

    this._queueTimelineEvents(timeline.events, effectiveBpm, sessionToken);
    this._startClockLoop(sessionToken);
    this._demoEndTimer = this._timers.setTimeout(() => {
      this._finishDemo(sessionToken);
    }, Math.max(0, timeline.totalBeats * (60 / effectiveBpm) * 1000 + 120));

    this._emitStateChange();
    return this.state;
  }

  async toggleClick({ sectionId, bpm, speedFactor = 1, beatsPerMeasure = 4 }) {
    if (this._state.mode === 'demo') {
      return this.state;
    }

    if (this._state.mode === 'click' && this._state.sectionId === sectionId) {
      this.stop();
      return this.state;
    }

    return this.startClick({ sectionId, bpm, speedFactor, beatsPerMeasure });
  }

  stop({ emitStateChange = true, stopAudio = true } = {}) {
    this._stopSession({ emitStateChange, stopAudio });
  }

  _openSession() {
    this._sessionToken += 1;
    return this._sessionToken;
  }

  _stopSession({ emitStateChange = true, stopAudio = true } = {}) {
    const previousState = this._state;
    const wasRunning = this.running;

    this._sessionToken += 1;
    this._clearClockLoop();
    this._clearEventTimers();

    if (this._demoEndTimer) {
      this._timers.clearTimeout(this._demoEndTimer);
      this._demoEndTimer = null;
    }

    this._state = createInitialPracticePlayerState();
    this._ctx = null;
    this._timeline = null;
    this._startTime = 0;
    this._nextBeatTime = 0;
    this._globalBeat = 0;

    if (stopAudio) {
      this._audio.stop();
    }

    if (wasRunning && emitStateChange) {
      this._emitStateChange(previousState);
    }
  }

  _startClockLoop(sessionToken) {
    this._clearClockLoop();
    this._intervalId = this._timers.setInterval(() => {
      this._scheduleBeatWindow(sessionToken);
    }, this._lookAheadMs);
  }

  _clearClockLoop() {
    if (this._intervalId) {
      this._timers.clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  _clearEventTimers() {
    this._eventTimers.forEach((timerId) => this._timers.clearTimeout(timerId));
    this._eventTimers = [];
  }

  _scheduleBeatWindow(sessionToken) {
    if (!this._ctx || !this.running || sessionToken !== this._sessionToken) {
      return;
    }

    while (this._nextBeatTime < this._ctx.currentTime + this._scheduleAheadTime) {
      const beatIndex = this._globalBeat % this._state.beatsPerMeasure;
      const delaySeconds = this._nextBeatTime - this._ctx.currentTime;
      const payload = {
        sectionId: this._state.sectionId,
        beat: beatIndex,
        beatNumber: beatIndex + 1,
        total: this._state.beatsPerMeasure,
        measureIndex: Math.floor(this._globalBeat / this._state.beatsPerMeasure),
        globalBeat: this._globalBeat,
        isAccent: beatIndex === 0,
      };

      if (this._state.mode === 'click') {
        this._audio.scheduleMetronomeClick(this._nextBeatTime, payload.isAccent);
      }

      this._queueBeatEvent(payload, delaySeconds, sessionToken);
      this._nextBeatTime += 60 / this._state.bpm;
      this._globalBeat += 1;
    }
  }

  _queueBeatEvent(payload, delaySeconds, sessionToken) {
    const timerId = this._timers.setTimeout(() => {
      this._eventTimers = this._eventTimers.filter((id) => id !== timerId);
      if (!this.running || sessionToken !== this._sessionToken) {
        return;
      }
      this._bus.emit('practice:beat', payload);
      this._bus.emit('metronome:beat', payload);
    }, Math.max(0, delaySeconds * 1000));

    this._eventTimers.push(timerId);
  }

  _queueTimelineEvents(events, bpm, sessionToken) {
    events.forEach((event) => {
      const eventTime = this._startTime + event.startOffsetBeats * (60 / bpm);
      const delayMs = Math.max(0, (eventTime - this._ctx.currentTime) * 1000);
      const timerId = this._timers.setTimeout(() => {
        this._eventTimers = this._eventTimers.filter((id) => id !== timerId);
        if (this._state.mode !== 'demo' || sessionToken !== this._sessionToken) {
          return;
        }

        this._bus.emit('practice:notechange', {
          sectionId: this._state.sectionId,
          noteIndex: event.noteIndex,
          measureIndex: event.measureIndex,
          startBeat: event.startBeat,
          isRest: event.isRest,
        });
      }, delayMs);

      this._eventTimers.push(timerId);
    });
  }

  _finishDemo(sessionToken) {
    if (this._state.mode !== 'demo' || sessionToken !== this._sessionToken) {
      return;
    }

    const previousState = this._state;
    this._sessionToken += 1;
    this._clearClockLoop();
    this._clearEventTimers();

    if (this._demoEndTimer) {
      this._timers.clearTimeout(this._demoEndTimer);
      this._demoEndTimer = null;
    }

    this._state = createInitialPracticePlayerState();
    this._ctx = null;
    this._timeline = null;
    this._startTime = 0;
    this._nextBeatTime = 0;
    this._globalBeat = 0;

    this._emitStateChange(previousState);
  }

  _emitStateChange(previousState = null) {
    this._bus.emit('practice:statechange', {
      ...this.state,
      previousMode: previousState?.mode || null,
      previousSectionId: previousState?.sectionId || null,
      previousPitch: previousState?.pitch || null,
    });
  }
}

export function createPracticePlayer(deps) {
  return new PracticePlayer(deps);
}

const practicePlayer = createPracticePlayer();

export default practicePlayer;
