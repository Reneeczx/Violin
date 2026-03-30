import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStaffModel } from '../js/staff-notation.js';
import { buildNotationExplainer } from '../js/music-theory.js';

const SAMPLE_MEASURES = [
  { notes: [{ pitch: 'REST', duration: 'whole' }] },
  {
    notes: [
      { pitch: 'REST', duration: 'half' },
      { pitch: 'G3', duration: 'quarter' },
      { pitch: 'G3', duration: 'quarter' },
    ],
  },
  {
    notes: [
      { pitch: 'D4', duration: 'quarter' },
      { pitch: 'A4', duration: 'quarter' },
      { pitch: 'E5', duration: 'half' },
    ],
  },
];

test('buildStaffModel produces header tokens and clickable measure tokens', () => {
  const model = buildStaffModel(SAMPLE_MEASURES, {
    beatsPerMeasure: 4,
    bpm: 48,
    timeSignature: [4, 4],
  });

  assert.equal(model.systems.length, 1);
  assert.ok(model.tokensById.clef);
  assert.ok(model.tokensById['time-signature']);
  assert.ok(model.tokensById.tempo);
  assert.equal(model.tokensById['rest-0'].tokenType, 'rest');
  assert.equal(model.tokensById['note-2'].tokenType, 'note');
  assert.equal(model.tokensById['note-2'].measureIndex, 1);
});

test('buildStaffModel marks leading rests so the explainer can describe the silent intro', () => {
  const model = buildStaffModel(SAMPLE_MEASURES, {
    beatsPerMeasure: 4,
    bpm: 48,
    timeSignature: [4, 4],
  });

  assert.equal(model.tokensById['rest-0'].isLeadingRest, true);
  assert.equal(model.tokensById['rest-1'].isLeadingRest, true);
  assert.equal(model.tokensById['note-2'].staffPositionLabel, '下加 3 间');
});

test('buildNotationExplainer maps notation tokens to focused learning copy', () => {
  const model = buildStaffModel(SAMPLE_MEASURES, {
    beatsPerMeasure: 4,
    bpm: 48,
    timeSignature: [4, 4],
  });
  const section = {
    measures: SAMPLE_MEASURES,
    baseBpm: 80,
    timeSignature: [4, 4],
  };

  const tempoExplainer = buildNotationExplainer(model.tokensById.tempo, section, 0.5);
  const restExplainer = buildNotationExplainer(model.tokensById['rest-0'], section, 0.5);
  const noteExplainer = buildNotationExplainer(model.tokensById['note-2'], section, 0.5);

  assert.equal(tempoExplainer.topicId, 'tempo');
  assert.equal(restExplainer.topicId, 'rests');
  assert.equal(noteExplainer.topicId, 'note-reading');
  assert.match(restExplainer.summary, /安静数/);
  assert.match(noteExplainer.title, /G3/);
});
