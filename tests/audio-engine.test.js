import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../js/audio-engine.js';

class FakeGainNode {
  constructor() {
    this.connections = [];
    this.gain = {
      value: 1,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
      exponentialRampToValueAtTime: () => {},
    };
  }

  connect(target) {
    this.connections.push(target);
  }

  disconnect() {}
}

class FakeBufferSourceNode {
  constructor() {
    this.connections = [];
    this.startCalls = [];
    this.stopCalls = [];
    this.buffer = null;
  }

  connect(target) {
    this.connections.push(target);
  }

  start(time) {
    this.startCalls.push(time);
  }

  stop(time) {
    this.stopCalls.push(time);
  }

  disconnect() {}
}

class FakeAudioContext {
  constructor(initialState = 'suspended') {
    this.state = initialState;
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = { nodeType: 'destination' };
    this.resumeCalls = 0;
    this.createdBufferSources = [];
  }

  createGain() {
    return new FakeGainNode();
  }

  createBuffer(channels, length, sampleRate) {
    return { channels, length, sampleRate };
  }

  createBufferSource() {
    const source = new FakeBufferSourceNode();
    this.createdBufferSources.push(source);
    return source;
  }

  resume() {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }
}

function withFakeWindow(callback) {
  const originalWindow = global.window;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  const scheduled = [];
  global.window = {
    AudioContext: class extends FakeAudioContext {},
    setTimeout(fn) {
      scheduled.push(fn);
      fn();
      return scheduled.length;
    },
    clearTimeout() {},
    addEventListener() {},
  };
  global.setTimeout = global.window.setTimeout;
  global.clearTimeout = global.window.clearTimeout;

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      if (originalWindow === undefined) {
        delete global.window;
      } else {
        global.window = originalWindow;
      }

      if (originalSetTimeout === undefined) {
        delete global.setTimeout;
      } else {
        global.setTimeout = originalSetTimeout;
      }

      if (originalClearTimeout === undefined) {
        delete global.clearTimeout;
      } else {
        global.clearTimeout = originalClearTimeout;
      }
    });
}

test('ensureContext primes a silent source on first gesture unlock', async () => {
  await withFakeWindow(async () => {
    const engine = new AudioEngine();
    const ctx = await engine.ensureContext();

    assert.equal(ctx.resumeCalls, 1);
    assert.equal(ctx.createdBufferSources.length, 1);
    assert.deepEqual(ctx.createdBufferSources[0].startCalls, [0]);

    await engine.ensureContext();
    assert.equal(ctx.createdBufferSources.length, 1);
  });
});

test('ensureContext resumes interrupted audio contexts', async () => {
  await withFakeWindow(async () => {
    const engine = new AudioEngine();
    const ctx = await engine.ensureContext();

    ctx.state = 'interrupted';
    await engine.ensureContext();

    assert.equal(ctx.resumeCalls, 2);
  });
});
