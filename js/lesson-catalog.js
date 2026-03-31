import { buildPublishedLessonHistory, getPublishedWeekPackages } from './week-package-store.js';

export function buildLessonCatalog(currentLesson = null, publishedPackages = [], today = new Date()) {
  const history = buildPublishedLessonHistory(currentLesson, today, publishedPackages);
  const publishedByWeek = new Map(
    (publishedPackages || []).map((weekPackage) => [weekPackage.weekOf, weekPackage]),
  );

  const lessons = history.map((lesson) => {
    const publishedPackage = publishedByWeek.get(lesson.weekOf);
    if (!publishedPackage) {
      return lesson;
    }

    return {
      ...lesson,
      isPublished: true,
      planKind: publishedPackage.planKind,
      publishedAt: publishedPackage.publishedAt,
      publishedFromDayNumber: publishedPackage.publishedFromDayNumber,
      authoringState: publishedPackage.authoringState,
      generationProvider: publishedPackage.generationProvider,
    };
  });

  return {
    lessons,
    byWeekOf: Object.fromEntries(lessons.map((lesson) => [lesson.weekOf, lesson])),
  };
}

export function getLessonCatalog() {
  const currentLesson = globalThis.window?.EMBEDDED_CURRENT_LESSON || globalThis.window?.CURRENT_LESSON || null;
  const publishedPackages = getPublishedWeekPackages();
  return buildLessonCatalog(currentLesson, publishedPackages);
}
