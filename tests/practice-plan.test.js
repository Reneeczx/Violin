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

test('inactive days produce an empty plan before a late-published week starts', () => {
  const lateLesson = {
    ...lesson,
    exercises: lesson.exercises.map((exercise) => ({
      ...exercise,
      progression: {
        ...exercise.progression,
        day1: { ...exercise.progression.day1, status: 'inactive' },
        day2: { ...exercise.progression.day2, status: 'inactive' },
        day3: { ...exercise.progression.day3, status: 'catchup' },
      },
    })),
  };

  const plan = generateDailyPlan(lateLesson, 1);

  assert.equal(plan.dayStatus, 'inactive');
  assert.equal(plan.totalMinutes, 0);
  assert.deepEqual(plan.sections, []);
});

test('catchup days stay executable and keep the day status', () => {
  const lateLesson = {
    ...lesson,
    exercises: lesson.exercises.map((exercise) => ({
      ...exercise,
      progression: {
        ...exercise.progression,
        day3: { ...exercise.progression.day3, status: 'catchup' },
      },
    })),
  };

  const plan = generateDailyPlan(lateLesson, 3);

  assert.equal(plan.dayStatus, 'catchup');
  assert.ok(plan.sections.length > 0);
  assert.ok(plan.sections.some((section) => section.planStatus === 'catchup'));
});

test('missing estimatedMinutes falls back to safe runtime defaults instead of producing invalid durations', () => {
  const importedLesson = {
    ...lesson,
    exercises: lesson.exercises.map((exercise) => {
      const { estimatedMinutes, ...rest } = exercise;
      return rest;
    }),
  };

  const plan = generateDailyPlan(importedLesson, 3);
  const exerciseSections = plan.sections.filter((section) => section.type === 'exercise');

  assert.ok(exerciseSections.length > 0);
  exerciseSections.forEach((section) => {
    assert.equal(Number.isFinite(section.durationMinutes), true);
    assert.ok(section.durationMinutes >= 2);
  });
});
