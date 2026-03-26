import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyPlan } from '../js/practice-plan.js';

globalThis.window = {};
await import('../data/lesson-current.js');

const lesson = window.CURRENT_LESSON;

test('day 3 piece plan exposes recommended and original tempo explicitly', () => {
  const plan = generateDailyPlan(lesson, 3);
  const piece = plan.sections.find((section) => section.id === 'ex-trick-or-treat');

  assert.ok(piece);
  assert.equal(piece.recommendedBpm, 48);
  assert.equal(piece.recommendedSpeedFactor, 0.6);
  assert.equal(piece.originalBpm, 80);
});

test('day 3 open string plan keeps the recommended bpm for the card badge', () => {
  const plan = generateDailyPlan(lesson, 3);
  const openStrings = plan.sections.find((section) => section.id === 'ex-open-strings');

  assert.ok(openStrings);
  assert.equal(openStrings.recommendedBpm, 55);
  assert.equal(openStrings.bpm, 55);
});
