import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonCatalog } from '../js/lesson-catalog.js';

globalThis.localStorage = {
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

globalThis.window = {};
await import('../data/lesson-current.js');

const fallbackLesson = window.CURRENT_LESSON;

test('buildLessonCatalog uses published packages plus fallback current lesson', () => {
  const publishedPackages = [
    {
      weekOf: '2026-03-30',
      status: 'published',
      planKind: 'lesson',
      publishedAt: '2026-03-30T10:00:00.000Z',
      publishedFromDayNumber: 1,
      authoringState: 'published',
      generationProvider: 'external_codex_manual',
      generatedLesson: {
        ...fallbackLesson,
        id: 'lesson-002',
        weekOf: '2026-03-30',
        title: '第二课 - 节奏与休止',
      },
    },
    {
      weekOf: '2026-03-23',
      status: 'published',
      planKind: 'lesson',
      publishedAt: '2026-03-23T10:00:00.000Z',
      publishedFromDayNumber: 1,
      authoringState: 'published',
      generationProvider: 'external_codex_manual',
      generatedLesson: {
        ...fallbackLesson,
        weekOf: '2026-03-23',
      },
    },
  ];

  const catalog = buildLessonCatalog(fallbackLesson, publishedPackages, new Date('2026-03-30T09:00:00'));

  assert.deepEqual(
    catalog.lessons.map((lesson) => lesson.weekOf),
    ['2026-03-30', '2026-03-23'],
  );
  assert.equal(catalog.byWeekOf['2026-03-30'].isPublished, true);
  assert.equal(catalog.byWeekOf['2026-03-30'].isCurrent, true);
  assert.equal(catalog.byWeekOf['2026-03-30'].title, '第二课 - 节奏与休止');
});

test('buildLessonCatalog falls back to embedded current lesson when no published current week exists', () => {
  const publishedPackages = [
    {
      weekOf: '2026-03-16',
      status: 'published',
      planKind: 'lesson',
      publishedAt: '2026-03-16T10:00:00.000Z',
      publishedFromDayNumber: 1,
      authoringState: 'published',
      generationProvider: 'external_codex_manual',
      generatedLesson: {
        ...fallbackLesson,
        weekOf: '2026-03-16',
      },
    },
  ];

  const catalog = buildLessonCatalog(fallbackLesson, publishedPackages, new Date('2026-03-23T09:00:00'));

  assert.deepEqual(
    catalog.lessons.map((lesson) => lesson.weekOf),
    ['2026-03-23', '2026-03-16'],
  );
  assert.equal(catalog.byWeekOf['2026-03-23'].isCurrent, true);
  assert.equal(catalog.byWeekOf['2026-03-23'].isPublished, false);
});

test('buildLessonCatalog exposes the previous real lesson as a readonly baseline before the current week is published', () => {
  const catalog = buildLessonCatalog(fallbackLesson, [], new Date('2026-03-30T09:00:00'));

  assert.deepEqual(
    catalog.lessons.map((lesson) => lesson.weekOf),
    ['2026-03-23'],
  );
  assert.equal(catalog.byWeekOf['2026-03-23'].isCurrent, false);
  assert.equal(catalog.byWeekOf['2026-03-23'].isPublished, false);
  assert.equal(catalog.byWeekOf['2026-03-23'].historySource, 'embedded-baseline');
});

test('buildLessonCatalog does not surface hidden prep seeds as the fallback baseline', () => {
  const prepLesson = {
    ...fallbackLesson,
    id: 'lesson-prep-001',
    weekOf: '2026-03-16',
    title: '准备周 - 持琴与空弦',
    titleEn: 'Prep Week - Posture and Open Strings',
  };

  const catalog = buildLessonCatalog(prepLesson, [], new Date('2026-03-30T09:00:00'));

  assert.deepEqual(catalog.lessons, []);
});
