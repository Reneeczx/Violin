import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticePlayer } from '../js/practice-player.js';

const TRICK_OR_TREAT_OPENING = [
  { notes: [{ pitch: 'REST', duration: 'whole' }] },
  { notes: [{ pitch: 'REST', duration: 'whole' }] },
  {
    notes: [
      { pitch: 'REST', duration: 'half' },
      { pitch: 'G3', duration: 'quarter' },
      { pitch: 'G3', duration: 'quarter' },
    ],
  },
];

function createFakeTimers() {
  let nowMs = 0;
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();

  function getNextTask(limit) {
    let nextTask = null;

    for (const [id, task] of timeouts) {
      if (task.time > limit) continue;
      if (!nextTask || task.time < nextTask.time) {
        nextTask = { kind: 'timeout', id, ...task };
      }
    }

    for (const [id, task] of intervals) {
      if (task.time > limit) continue;
      if (!nextTask || task.time < nextTask.time) {
        nextTask = { kind: 'interval', id, ...task };
      }
    }

    return nextTask;
  }

  return {
    get nowMs() {
      return nowMs;
    },
    setTimeout(callback, delay = 0) {
      const id = nextId++;
      timeouts.set(id, { time: nowMs + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
      intervals.delete(id);
    },
    setInterval(callback, delay = 0) {
      const id = nextId++;
      intervals.set(id, { time: nowMs + delay, delay, callback });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    advance(ms) {
      const target = nowMs + ms;

      while (true) {
        const task = getNextTask(target);
        if (!task) break;

        nowMs = task.time;
        if (task.kind === 'timeout') {
          timeouts.delete(task.id);
          task.callback();
          continue;
        }

        const interval = intervals.get(task.id);
        if (!interval) continue;
        interval.time += interval.delay;
        task.callback();
      }

      nowMs = target;
    },
  };
}

function createFakeBus() {
  const events = [];
  return {
    events,
    emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function createFakeAudio(timers) {
  const calls = [];
  const ctx = {};
  Object.defineProperty(ctx, 'currentTime', {
    get() {
      return timers.nowMs / 1000;
    },
  });

  return {
    calls,
    async ensureContext() {
      calls.push(['ensureContext']);
      return ctx;
    },
    async startReferenceTone(pitch) {
      calls.push(['startReferenceTone', pitch]);
      return true;
    },
    async playSequence(timeline, bpm, { startTime } = {}) {
      calls.push(['playSequence', timeline.length, bpm, Number(startTime.toFixed(2))]);
      return startTime + (timeline.at(-1)?.endOffsetBeats || 0) * (60 / bpm);
    },
    scheduleMetronomeClick(time, isAccent) {
      calls.push(['scheduleMetronomeClick', Number(time.toFixed(2)), isAccent]);
    },
    stop() {
      calls.push(['stop']);
    },
  };
}

test('idle -> reference -> idle', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startReference({ sectionId: 'open-strings', pitch: 'E5' });
  assert.deepEqual(player.state, {
    mode: 'reference',
    sectionId: 'open-strings',
    pitch: 'E5',
    bpm: null,
    beatsPerMeasure: 4,
    running: true,
  });

  player.stop();
  assert.deepEqual(player.state, {
    mode: 'idle',
    sectionId: null,
    pitch: null,
    bpm: null,
    beatsPerMeasure: 4,
    running: false,
  });

  assert.deepEqual(audio.calls.map((call) => call[0]), ['startReferenceTone', 'stop']);
});

test('reference -> reference switches pitch through one shared session owner', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startReference({ sectionId: 'open-strings', pitch: 'E5' });
  await player.startReference({ sectionId: 'open-strings', pitch: 'A4' });

  assert.equal(player.state.mode, 'reference');
  assert.equal(player.state.pitch, 'A4');
  assert.deepEqual(audio.calls.map((call) => call[0]), ['startReferenceTone', 'stop', 'startReferenceTone']);
});

test('click -> demo replaces the active session and emits demo notes', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startClick({
    sectionId: 'piece',
    bpm: 80,
    beatsPerMeasure: 4,
  });
  await player.startDemo({
    sectionId: 'piece',
    measures: TRICK_OR_TREAT_OPENING,
    bpm: 80,
    beatsPerMeasure: 4,
  });

  timers.advance(300);

  assert.equal(player.state.mode, 'demo');
  assert.ok(bus.events.some((event) => event.name === 'practice:notechange'));
  assert.deepEqual(audio.calls.map((call) => call[0]), ['ensureContext', 'ensureContext', 'stop', 'playSequence']);
});

test('reference -> demo clears the old session before scheduling the phrase', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startReference({ sectionId: 'open-strings', pitch: 'G3' });
  await player.startDemo({
    sectionId: 'piece',
    measures: TRICK_OR_TREAT_OPENING,
    bpm: 80,
    beatsPerMeasure: 4,
  });

  assert.equal(player.state.mode, 'demo');
  assert.deepEqual(audio.calls.map((call) => call[0]), ['startReferenceTone', 'ensureContext', 'stop', 'playSequence']);
});

test('demo ignores metronome toggles and keeps the same state', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startDemo({
    sectionId: 'piece',
    measures: TRICK_OR_TREAT_OPENING,
    bpm: 80,
    beatsPerMeasure: 4,
  });

  const callCountBefore = audio.calls.length;
  const stateBefore = player.state;
  await player.toggleClick({
    sectionId: 'piece',
    bpm: 80,
    beatsPerMeasure: 4,
  });

  assert.deepEqual(player.state, stateBefore);
  assert.equal(audio.calls.length, callCountBefore);
});

test('switching sessions does not leak stale beat events from the previous mode', async () => {
  const timers = createFakeTimers();
  const bus = createFakeBus();
  const audio = createFakeAudio(timers);
  const player = createPracticePlayer({ audio, bus, timerApi: timers });

  await player.startClick({
    sectionId: 'open-strings',
    bpm: 60,
    beatsPerMeasure: 4,
  });

  timers.advance(60);

  await player.startDemo({
    sectionId: 'piece',
    measures: TRICK_OR_TREAT_OPENING,
    bpm: 80,
    beatsPerMeasure: 4,
  });

  timers.advance(200);

  const beatEvents = bus.events.filter((event) => event.name === 'practice:beat');
  assert.ok(beatEvents.length > 0);
  assert.ok(beatEvents.every((event) => event.payload.sectionId === 'piece'));
});
