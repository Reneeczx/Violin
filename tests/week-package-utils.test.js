import test from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorageMock() {
  return {
    _data: new Map(),
    getItem(key) {
      return this._data.has(key) ? this._data.get(key) : null;
    },
    setItem(key, value) {
      this._data.set(key, String(value));
    },
    removeItem(key) {
      this._data.delete(key);
    },
    clear() {
      this._data.clear();
    },
  };
}

globalThis.localStorage = createLocalStorageMock();
globalThis.window = {};

await import('../data/lesson-current.js');

const { saveDraftShell, importWeekPackage, publishWeekPackage, getWeekPackage } = await import('../js/week-package-store.js');
const { buildWeekManifest, buildCodexPrompt, validateWeekPackage } = await import('../js/week-package-utils.js');

const lesson = window.CURRENT_LESSON;

function buildPackage(overrides = {}) {
  return {
    weekOf: '2026-03-30',
    status: 'draft',
    planKind: 'lesson',
    publishedAt: null,
    publishedFromDayNumber: 1,
    teacherBrief: '老师要求把节奏先数稳。',
    manualCoachingFocus: [],
    sourceAssets: [{ id: 'asset-1', name: 'lesson.pdf', type: 'application/pdf', size: 2048 }],
    generationProvider: 'external_codex_manual',
    generationMeta: { promptVersion: 1 },
    generatedLesson: {
      ...lesson,
      weekOf: '2026-03-30',
      id: 'lesson-002',
      title: '第二课 - 节奏与休止',
    },
    ...overrides,
  };
}

test('validateWeekPackage rejects missing runtime fields', () => {
  const errors = validateWeekPackage({
    weekOf: '2026-03-30',
    planKind: 'lesson',
    generationProvider: 'external_codex_manual',
    generatedLesson: {
      weekOf: '2026-03-30',
      lessonDay: 1,
      title: 'Broken',
      exercises: [{ id: 'ex-1', type: 'piece', title: 'Broken Piece', progression: {} }],
    },
  });

  assert.ok(errors.some((error) => error.includes('progression.day1')));
  assert.ok(errors.some((error) => error.includes('.measures')));
  assert.ok(errors.some((error) => error.includes('.estimatedMinutes')));
});

test('buildWeekManifest includes recent published context and review candidates', () => {
  localStorage.clear();

  saveDraftShell({
    weekOf: '2026-03-23',
    planKind: 'lesson',
    teacherBrief: '先把上一周的曲子拉顺。',
    sourceAssets: [],
  });
  importWeekPackage(buildPackage({
    weekOf: '2026-03-23',
    generatedLesson: {
      ...lesson,
      weekOf: '2026-03-23',
      id: 'lesson-001',
      title: '第一课 - 认识空弦',
    },
  }));
  publishWeekPackage('2026-03-23');

  const draftPackage = buildPackage();
  const manifest = buildWeekManifest(draftPackage);

  assert.equal(manifest.weekOf, '2026-03-30');
  assert.equal(manifest.recentPublishedWeeks.length, 1);
  assert.equal(manifest.recentPublishedWeeks[0].weekOf, '2026-03-23');
  assert.equal(manifest.plannerRole.title, 'Beginner Violin Weekly Practice Planner');
  assert.equal(manifest.practiceBudget.activeDayTargetMinutes, 12);
  assert.equal(typeof manifest.learningProfile.stageLabel, 'string');
  assert.ok(Array.isArray(manifest.learningProfile.currentCoverage));
  assert.ok(manifest.learningProfile.currentCoverage.some((item) => item.includes('休止') || item.includes('空弦')));
  assert.ok(Array.isArray(manifest.weeklyGoalHints));
  assert.ok(Array.isArray(manifest.studentProfile.currentAbilities));
  assert.ok(Array.isArray(manifest.suggestedCoachingFocus));
  assert.ok(Array.isArray(manifest.confirmedCoachingFocus));
  assert.ok(Array.isArray(manifest.reviewCandidates));

  const prompt = buildCodexPrompt(manifest);
  assert.match(prompt, /Return JSON only/);
  assert.match(prompt, /## Role/);
  assert.match(prompt, /## Learning Profile/);
  assert.match(prompt, /## Student Profile/);
  assert.match(prompt, /## Practice Budget/);
  assert.match(prompt, /## Weekly Goal Hints/);
  assert.match(prompt, /## Suggested Coaching Focus/);
  assert.match(prompt, /## Confirmed Weekly Focus/);
  assert.match(prompt, /## Self-check Before Final JSON/);
  assert.match(prompt, /publishedFromDayNumber/);
});

test('buildWeekManifest falls back to the embedded previous lesson as authoring context before first publish', () => {
  localStorage.clear();

  const manifest = buildWeekManifest(buildPackage());

  assert.equal(manifest.recentPublishedWeeks.length, 1);
  assert.equal(manifest.recentPublishedWeeks[0].weekOf, '2026-03-23');
  assert.equal(manifest.recentPublishedWeeks[0].sourceKind, 'embedded-baseline');
  assert.equal(manifest.carryOverContext.latestReferenceWeek.weekOf, '2026-03-23');
});

test('buildWeekManifest uses builder-adjusted coaching focus when provided', () => {
  localStorage.clear();

  const manifest = buildWeekManifest(buildPackage({
    manualCoachingFocus: ['只保留一个重点：休止要先数清楚', '换弦时先慢下来'],
  }));

  assert.deepEqual(
    manifest.confirmedCoachingFocus.map((item) => item.focus),
    ['只保留一个重点：休止要先数清楚', '换弦时先慢下来'],
  );
  assert.equal(manifest.studentProfile.currentFocusAreas[0], '只保留一个重点：休止要先数清楚');

  const prompt = buildCodexPrompt(manifest);
  assert.match(prompt, /只保留一个重点：休止要先数清楚/);
  assert.match(prompt, /换弦时先慢下来/);
});

test('buildWeekManifest excludes inactive days from late-published week completion rate', async () => {
  localStorage.clear();

  const State = (await import('../js/state.js')).default;

  saveDraftShell({
    weekOf: '2026-03-23',
    planKind: 'lesson',
    teacherBrief: '周三才开始执行',
    sourceAssets: [],
  });
  importWeekPackage(buildPackage({
    weekOf: '2026-03-23',
    publishedFromDayNumber: 3,
    generatedLesson: {
      ...lesson,
      weekOf: '2026-03-23',
      id: 'lesson-001',
      title: '第一课 - 认识空弦',
      exercises: lesson.exercises.map((exercise) => ({
        ...exercise,
        progression: {
          ...exercise.progression,
          day1: { ...exercise.progression.day1, status: 'inactive' },
          day2: { ...exercise.progression.day2, status: 'inactive' },
        },
      })),
    },
  }));
  publishWeekPackage('2026-03-23');

  State.saveWeekTracking('2026-03-23', {
    weekOf: '2026-03-23',
    days: {
      3: {
        completedAt: new Date('2026-03-25T09:00:00.000Z').toISOString(),
        sections: {},
        totalSeconds: 300,
      },
    },
  });

  const manifest = buildWeekManifest(buildPackage());

  assert.equal(manifest.recentPublishedWeeks[0].publishedFromDayNumber, 3);
  assert.equal(manifest.recentPublishedWeeks[0].activeDayCount, 5);
  assert.equal(manifest.recentPublishedWeeks[0].completionRate, 0.2);
  assert.equal(manifest.learningProfile.averageCompletionRatePercent, 20);
  assert.match(buildCodexPrompt(manifest), /completedDays=1\/5/);
});
