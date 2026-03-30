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

const store = await import('../js/week-package-store.js');
const baseLesson = window.CURRENT_LESSON;

function buildDraftPackage(overrides = {}) {
  return {
    weekOf: '2026-03-30',
    status: 'draft',
    planKind: 'lesson',
    publishedAt: null,
    publishedFromDayNumber: 3,
    teacherBrief: '老师要求先稳住节奏，再补上休止。',
    sourceAssets: [],
    generationProvider: 'external_codex_manual',
    generationMeta: { promptVersion: 1 },
    generatedLesson: {
      ...baseLesson,
      id: 'lesson-002',
      weekOf: '2026-03-30',
      title: '第二课 - 节奏与休止',
    },
    ...overrides,
  };
}

test('draft shell -> import -> publish lifecycle stays in one week package', () => {
  localStorage.clear();

  store.saveDraftShell({
    weekOf: '2026-03-30',
    planKind: 'lesson',
    publishedFromDayNumber: 3,
    teacherBrief: '老师要求先稳住节奏，再补上休止。',
    sourceAssets: [{ id: 'asset-1', name: 'score.pdf', type: 'application/pdf', size: 1024 }],
    manualCoachingFocus: ['休止要先数清楚', '换弦先慢一点'],
  });

  const draftShell = store.getWeekPackage('2026-03-30');
  assert.equal(draftShell.authoringState, 'ready-for-export');
  assert.equal(draftShell.status, 'draft');
  assert.deepEqual(draftShell.manualCoachingFocus, ['休止要先数清楚', '换弦先慢一点']);

  store.importWeekPackage(buildDraftPackage());
  const importedDraft = store.getWeekPackage('2026-03-30');
  assert.equal(importedDraft.authoringState, 'draft-imported');
  assert.equal(importedDraft.generatedLesson.exercises[0].progression.day1.status, 'inactive');
  assert.equal(importedDraft.generatedLesson.exercises[0].progression.day2.status, 'inactive');
  assert.deepEqual(importedDraft.manualCoachingFocus, ['休止要先数清楚', '换弦先慢一点']);

  store.publishWeekPackage('2026-03-30');
  const published = store.getWeekPackage('2026-03-30');
  assert.equal(published.status, 'published');
  assert.equal(published.authoringState, 'published');
  assert.ok(published.publishedAt);
  assert.deepEqual(published.manualCoachingFocus, ['休止要先数清楚', '换弦先慢一点']);
});

test('resolveRuntimeLesson prefers published current week over embedded fallback', () => {
  localStorage.clear();

  store.importWeekPackage(buildDraftPackage());
  store.publishWeekPackage('2026-03-30');

  const runtimeLesson = store.resolveRuntimeLesson(baseLesson, new Date('2026-03-30T09:00:00'));
  assert.equal(runtimeLesson.weekOf, '2026-03-30');
  assert.equal(runtimeLesson.title, '第二课 - 节奏与休止');
  assert.equal(runtimeLesson.publishedFromDayNumber, 3);
});

test('buildPublishedLessonHistory injects the embedded previous lesson as a readonly baseline', () => {
  localStorage.clear();

  const history = store.buildPublishedLessonHistory(baseLesson, new Date('2026-03-30T09:00:00'), []);

  assert.deepEqual(history.map((lesson) => lesson.weekOf), ['2026-03-23']);
  assert.equal(history[0].historySource, 'embedded-baseline');
  assert.equal(history[0].isCurrent, false);
});

test('published week packages cannot be overwritten by a new draft shell or import', () => {
  localStorage.clear();

  store.saveDraftShell({
    weekOf: '2026-03-30',
    planKind: 'lesson',
    publishedFromDayNumber: 1,
    teacherBrief: 'original published week',
    sourceAssets: [],
  });
  store.importWeekPackage(buildDraftPackage({
    teacherBrief: 'original published week',
  }));
  store.publishWeekPackage('2026-03-30');

  assert.throws(
    () => store.saveDraftShell({
      weekOf: '2026-03-30',
      planKind: 'lesson',
      publishedFromDayNumber: 1,
      teacherBrief: 'mutated after publish',
      sourceAssets: [],
    }),
    /read-only/,
  );
  assert.throws(
    () => store.importWeekPackage(buildDraftPackage({
      teacherBrief: 'mutated after publish',
    })),
    /read-only/,
  );

  const publishedPackage = store.getWeekPackage('2026-03-30');
  assert.equal(publishedPackage.status, 'published');
  assert.equal(publishedPackage.teacherBrief, 'original published week');
});
