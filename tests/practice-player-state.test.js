import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPracticePlayerState,
  reducePracticePlayerState,
} from '../js/practice-player-state.js';

test('START_REFERENCE enters reference mode with pitch ownership', () => {
  const nextState = reducePracticePlayerState(createInitialPracticePlayerState(), {
    type: 'START_REFERENCE',
    sectionId: 'open-strings',
    pitch: 'E5',
  });

  assert.deepEqual(nextState, {
    mode: 'reference',
    sectionId: 'open-strings',
    pitch: 'E5',
    bpm: null,
    beatsPerMeasure: 4,
  });
});

test('START_CLICK enters click-only mode', () => {
  const nextState = reducePracticePlayerState(createInitialPracticePlayerState(), {
    type: 'START_CLICK',
    sectionId: 'open-strings',
    bpm: 60,
    beatsPerMeasure: 4,
  });

  assert.deepEqual(nextState, {
    mode: 'click',
    sectionId: 'open-strings',
    pitch: null,
    bpm: 60,
    beatsPerMeasure: 4,
  });
});

test('START_DEMO enters demo mode without click overlay', () => {
  const nextState = reducePracticePlayerState(createInitialPracticePlayerState(), {
    type: 'START_DEMO',
    sectionId: 'trick-or-treat',
    bpm: 48,
    beatsPerMeasure: 4,
  });

  assert.deepEqual(nextState, {
    mode: 'demo',
    sectionId: 'trick-or-treat',
    pitch: null,
    bpm: 48,
    beatsPerMeasure: 4,
  });
});

test('STOP returns the player to idle', () => {
  const state = reducePracticePlayerState(createInitialPracticePlayerState(), {
    type: 'START_DEMO',
    sectionId: 'piece',
    bpm: 80,
    beatsPerMeasure: 4,
  });

  assert.deepEqual(
    reducePracticePlayerState(state, { type: 'STOP' }),
    createInitialPracticePlayerState(),
  );
});
