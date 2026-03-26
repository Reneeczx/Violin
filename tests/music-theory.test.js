import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpeedOptions,
  describeTimeSignature,
  formatTempoMarking,
  getEffectiveBpm,
  getLeadingRestBreakdown,
  getLeadingRestInfo,
} from '../js/music-theory.js';

const TRICK_OR_TREAT_MEASURES = [
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

test('buildSpeedOptions keeps the recommended speed visible even when it is non-standard', () => {
  const options = buildSpeedOptions(0.6);

  assert.deepEqual(options.map((option) => option.value), [0.6, 0.5, 0.75, 1]);
  assert.equal(options[0].label, '推荐 60%');
});

test('buildSpeedOptions does not duplicate a standard recommended speed', () => {
  const options = buildSpeedOptions(0.5);

  assert.deepEqual(options.map((option) => option.value), [0.5, 0.75, 1]);
  assert.equal(options[0].label, '推荐 50%');
});

test('leading rests are converted into beginner-friendly timing hints', () => {
  const info = getLeadingRestInfo(TRICK_OR_TREAT_MEASURES, 80, 0.6);

  assert.deepEqual(info, {
    beats: 10,
    noteCount: 3,
    seconds: 12.5,
    tempoMarking: '♩=48',
  });
});

test('leading rest breakdown explains where the 10 beats come from', () => {
  const breakdown = getLeadingRestBreakdown(TRICK_OR_TREAT_MEASURES, 80, 0.6);

  assert.equal(breakdown.breakdownText, '2个整休止（8拍） + 1个二分休止（2拍）');
  assert.equal(breakdown.beats, 10);
  assert.equal(breakdown.seconds, 12.5);
});

test('tempo helpers keep UI wording stable', () => {
  assert.equal(getEffectiveBpm(80, 0.6), 48);
  assert.equal(formatTempoMarking(48), '♩=48');
  assert.equal(describeTimeSignature([4, 4]), '4/4 表示每小节 4 拍，每拍是一个四分音符。');
});
