import State from './state.js';

const STORAGE_KEY = 'week_packages_v1';
const SCHEMA_VERSION = 1;
export const GENERATION_PROVIDER = 'external_codex_manual';

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clampDayNumber(value) {
  const numeric = Number(value) || 1;
  return Math.max(1, Math.min(7, Math.round(numeric)));
}

function sortByWeekDesc(packages) {
  return [...packages].sort((left, right) => new Date(right.weekOf) - new Date(left.weekOf));
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadPackages() {
  const packages = State.load(STORAGE_KEY, []);
  return Array.isArray(packages)
    ? sortByWeekDesc(packages.filter((item) => item?.weekOf))
    : [];
}

function savePackages(packages) {
  State.save(STORAGE_KEY, sortByWeekDesc(packages));
}

function upsertPackage(nextPackage) {
  const packages = loadPackages();
  const nextPackages = packages.filter((item) => item.weekOf !== nextPackage.weekOf);
  nextPackages.push(nextPackage);
  savePackages(nextPackages);
  return cloneJson(nextPackage);
}

function assertEditableWeekPackage(existingPackage, weekOf) {
  if (existingPackage?.status === 'published') {
    throw new Error(`Week package ${weekOf} is already published and read-only`);
  }
}

function deriveAuthoringState(weekPackage) {
  if (weekPackage.status === 'published') {
    return 'published';
  }

  if (weekPackage.generatedLesson) {
    return 'draft-imported';
  }

  if (weekPackage.planKind === 'review') {
    return weekPackage.weekOf ? 'ready-for-export' : 'draft-shell';
  }

  return weekPackage.teacherBrief?.trim() && weekPackage.sourceAssets?.length
    ? 'ready-for-export'
    : 'draft-shell';
}

function normalizeGeneratedLesson(generatedLesson, weekOf, publishedFromDayNumber) {
  if (!generatedLesson || typeof generatedLesson !== 'object') {
    return null;
  }

  const lesson = cloneJson(generatedLesson);
  lesson.weekOf = lesson.weekOf || weekOf;
  lesson.lessonDay = lesson.lessonDay || 1;

  if (publishedFromDayNumber > 1 && Array.isArray(lesson.exercises)) {
    lesson.exercises = lesson.exercises.map((exercise) => {
      if (!exercise?.progression) {
        return exercise;
      }

      const progression = { ...exercise.progression };
      for (let dayNumber = 1; dayNumber < publishedFromDayNumber; dayNumber += 1) {
        const dayKey = `day${dayNumber}`;
        progression[dayKey] = {
          ...(progression[dayKey] || {}),
          status: 'inactive',
        };
      }

      return {
        ...exercise,
        progression,
      };
    });
  }

  return lesson;
}

function isHiddenSeedLesson(lesson) {
  if (!lesson) {
    return false;
  }

  if (lesson.historyVisibility === 'hidden' || lesson.seedOnly === true) {
    return true;
  }

  const text = [lesson.id, lesson.title, lesson.titleEn]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('prep week')
    || text.includes('课前准备')
    || text.includes('准备周');
}

function toPublishedLessonEntry(weekPackage) {
  return {
    ...weekPackage.generatedLesson,
    weekOf: weekPackage.weekOf,
    isCurrent: false,
    isPublished: true,
    historySource: 'published-package',
    planKind: weekPackage.planKind,
    publishedAt: weekPackage.publishedAt,
    publishedFromDayNumber: weekPackage.publishedFromDayNumber,
    teacherBrief: weekPackage.teacherBrief || '',
    weekPackageMeta: {
      status: weekPackage.status,
      generationProvider: weekPackage.generationProvider,
      authoringState: weekPackage.authoringState,
    },
  };
}

function toEmbeddedLessonEntry(lesson, {
  isCurrent = false,
  historySource = 'embedded-current-fallback',
} = {}) {
  return {
    ...cloneJson(lesson),
    isCurrent,
    isPublished: false,
    historySource,
    isBaseline: historySource === 'embedded-baseline',
    planKind: lesson.planKind || 'lesson',
    publishedAt: null,
    publishedFromDayNumber: lesson.publishedFromDayNumber || 1,
    teacherBrief: lesson.teacherBrief || '',
  };
}

export function getCurrentWeekOf(today = new Date()) {
  const localStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = localStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  localStart.setDate(localStart.getDate() + mondayOffset);
  return formatLocalDate(localStart);
}

export function getDayNumberForWeek(weekOf, today = new Date()) {
  const start = new Date(`${weekOf}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayStart - start) / 86400000);
  if (diffDays < 0 || diffDays > 6) {
    return null;
  }
  return diffDays + 1;
}

export function getAllWeekPackages() {
  return cloneJson(loadPackages());
}

export function getWeekPackage(weekOf) {
  return getAllWeekPackages().find((item) => item.weekOf === weekOf) || null;
}

export function getPublishedWeekPackages() {
  return getAllWeekPackages().filter((item) => item.status === 'published' && item.generatedLesson?.weekOf);
}

export function getPublishedLessonEntries() {
  return getPublishedWeekPackages().map(toPublishedLessonEntry);
}

export function resolveRuntimeLesson(fallbackLesson, today = new Date()) {
  const currentWeekOf = getCurrentWeekOf(today);
  const publishedPackage = getPublishedWeekPackages().find((item) => item.weekOf === currentWeekOf);
  return publishedPackage ? toPublishedLessonEntry(publishedPackage) : (fallbackLesson || null);
}

export function resolveRuntimeWeekPackage(today = new Date()) {
  const currentWeekOf = getCurrentWeekOf(today);
  return getPublishedWeekPackages().find((item) => item.weekOf === currentWeekOf) || null;
}

export function saveDraftShell({
  weekOf,
  planKind = 'lesson',
  publishedFromDayNumber = 1,
  teacherBrief = '',
  sourceAssets = [],
  manualCoachingFocus = [],
} = {}) {
  if (!weekOf) {
    throw new Error('weekOf is required');
  }

  const existing = getWeekPackage(weekOf) || {};
  assertEditableWeekPackage(existing, weekOf);
  const nextPackage = {
    schemaVersion: SCHEMA_VERSION,
    weekOf,
    status: 'draft',
    planKind,
    lessonDay: 1,
    publishedAt: existing.publishedAt || null,
    publishedFromDayNumber: clampDayNumber(publishedFromDayNumber ?? existing.publishedFromDayNumber),
    teacherBrief,
    sourceAssets: cloneJson(sourceAssets),
    manualCoachingFocus: cloneJson(Array.isArray(manualCoachingFocus) ? manualCoachingFocus : (existing.manualCoachingFocus || [])),
    generationProvider: GENERATION_PROVIDER,
    generationMeta: {
      ...(existing.generationMeta || {}),
      provider: GENERATION_PROVIDER,
      promptVersion: 1,
    },
    generatedLesson: existing.generatedLesson || null,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  nextPackage.authoringState = deriveAuthoringState(nextPackage);
  return upsertPackage(nextPackage);
}

export function importWeekPackage(importedPackage) {
  if (!importedPackage?.weekOf) {
    throw new Error('Imported week package must include weekOf');
  }

  const existing = getWeekPackage(importedPackage.weekOf) || {};
  assertEditableWeekPackage(existing, importedPackage.weekOf);
  const publishedFromDayNumber = clampDayNumber(
    importedPackage.publishedFromDayNumber ?? existing.publishedFromDayNumber ?? 1,
  );
  const nextPackage = {
    schemaVersion: SCHEMA_VERSION,
    weekOf: importedPackage.weekOf,
    status: 'draft',
    planKind: importedPackage.planKind || existing.planKind || 'lesson',
    lessonDay: 1,
    publishedAt: null,
    publishedFromDayNumber,
    teacherBrief: importedPackage.teacherBrief ?? existing.teacherBrief ?? '',
    sourceAssets: cloneJson(importedPackage.sourceAssets?.length ? importedPackage.sourceAssets : (existing.sourceAssets || [])),
    manualCoachingFocus: cloneJson(
      Array.isArray(importedPackage.manualCoachingFocus)
        ? importedPackage.manualCoachingFocus
        : (existing.manualCoachingFocus || []),
    ),
    generationProvider: GENERATION_PROVIDER,
    generationMeta: {
      ...(existing.generationMeta || {}),
      ...(importedPackage.generationMeta || {}),
      provider: GENERATION_PROVIDER,
      importedAt: new Date().toISOString(),
    },
    generatedLesson: normalizeGeneratedLesson(
      importedPackage.generatedLesson,
      importedPackage.weekOf,
      publishedFromDayNumber,
    ),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  nextPackage.authoringState = deriveAuthoringState(nextPackage);
  return upsertPackage(nextPackage);
}

export function publishWeekPackage(weekOf) {
  const weekPackage = getWeekPackage(weekOf);
  if (!weekPackage?.generatedLesson) {
    return null;
  }

  const nextPackage = {
    ...weekPackage,
    status: 'published',
    publishedAt: weekPackage.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  nextPackage.authoringState = deriveAuthoringState(nextPackage);
  return upsertPackage(nextPackage);
}

export function deleteWeekPackage(weekOf) {
  const nextPackages = loadPackages().filter((item) => item.weekOf !== weekOf);
  savePackages(nextPackages);
}

export function buildPublishedLessonHistory(
  fallbackLesson = null,
  today = new Date(),
  publishedPackages = getPublishedWeekPackages(),
) {
  const currentWeekOf = getCurrentWeekOf(today);
  const publishedLessons = publishedPackages.map(toPublishedLessonEntry);
  const byWeekOf = new Map(
    publishedLessons.map((lesson) => [lesson.weekOf, {
      ...lesson,
      isCurrent: lesson.weekOf === currentWeekOf,
    }]),
  );

  if (fallbackLesson?.weekOf === currentWeekOf && !byWeekOf.has(fallbackLesson.weekOf)) {
    byWeekOf.set(
      fallbackLesson.weekOf,
      toEmbeddedLessonEntry(fallbackLesson, {
        isCurrent: true,
        historySource: 'embedded-current-fallback',
      }),
    );
  } else if (
    fallbackLesson?.weekOf
    && !byWeekOf.has(fallbackLesson.weekOf)
    && !isHiddenSeedLesson(fallbackLesson)
    && new Date(`${fallbackLesson.weekOf}T00:00:00`) < new Date(`${currentWeekOf}T00:00:00`)
  ) {
    byWeekOf.set(
      fallbackLesson.weekOf,
      toEmbeddedLessonEntry(fallbackLesson, {
        isCurrent: false,
        historySource: 'embedded-baseline',
      }),
    );
  }

  return sortByWeekDesc([...byWeekOf.values()]);
}
