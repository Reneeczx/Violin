import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlaybackTimeline,
  buildScoreModel,
  getTotalBeats,
} from '../js/score-utils.js';

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

test('buildScoreModel expands each measure into beat-aware cells', () => {
  const model = buildScoreModel(TRICK_OR_TREAT_OPENING, { beatsPerMeasure: 4 });

  assert.equal(model.length, 3);
  assert.deepEqual(model[0].beatLabels.map((beat) => beat.beatNumber), [1, 2, 3, 4]);
  assert.equal(model[0].cells[0].spanUnits, 16);
  assert.equal(model[1].cells[0].spanUnits, 16);
  assert.equal(model[2].cells[0].spanUnits, 8);
  assert.equal(model[2].measureIndex, 2);
  assert.equal(model[2].cells[1].measureIndex, 2);
  assert.equal(model[2].cells[0].startBeat, 1);
  assert.equal(model[2].cells[1].startBeat, 3);
  assert.equal(model[2].cells[2].startBeat, 4);
});

test('buildPlaybackTimeline stays aligned with the score model', () => {
  const modelCells = buildScoreModel(TRICK_OR_TREAT_OPENING, { beatsPerMeasure: 4 })
    .flatMap((measure) => measure.cells);
  const timeline = buildPlaybackTimeline(TRICK_OR_TREAT_OPENING, { beatsPerMeasure: 4 });

  assert.equal(timeline.totalBeats, 12);
  assert.equal(timeline.events.length, modelCells.length);

  timeline.events.forEach((event, index) => {
    const cell = modelCells[index];
    assert.equal(event.noteIndex, cell.noteIndex);
    assert.equal(event.measureIndex, cell.measureIndex);
    assert.equal(event.startBeat, cell.startBeat);
    assert.equal(event.beats, cell.beats);
  });

  assert.deepEqual(
    timeline.events.map((event) => event.startOffsetBeats),
    [0, 4, 8, 10, 11],
  );
});

test('getTotalBeats keeps the playback timing aligned with the whole phrase', () => {
  assert.equal(getTotalBeats(TRICK_OR_TREAT_OPENING), 12);
});
