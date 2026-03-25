/**
 * Daily practice plan generator.
 * Takes the current lesson config and day number (1-7),
 * produces a structured practice plan.
 */

const DAY_THEMES = [
  '', // placeholder (1-indexed)
  '初次接触，慢慢熟悉',
  '巩固基础，稳定节奏',
  '逐步提速，加入新技巧',
  '强化练习，注意细节',
  '接近原速，流畅演奏',
  '完整串联，模拟表演',
  '最终复习，准备上课',
];

/**
 * Calculate which practice day (1-7) today is,
 * based on the lesson day of week.
 * Day 1 = lesson day, Day 7 = day before next lesson.
 */
export function getDayNumber(lessonDay, today = new Date()) {
  const todayDow = today.getDay() || 7; // Convert Sunday 0 -> 7
  let diff = (todayDow - lessonDay + 7) % 7;
  return diff === 0 ? 1 : diff + 1; // Lesson day itself is Day 1
}

/**
 * Generate the daily plan.
 */
export function generateDailyPlan(lesson, dayNumber) {
  const dayKey = `day${dayNumber}`;
  const totalTarget = 12; // minutes target

  const sections = [];

  // 1. Warm-up (fixed 2 min)
  sections.push({
    id: 'warmup',
    type: 'warmup',
    title: '热身',
    icon: '🔥',
    durationMinutes: 2,
    description: dayNumber <= 3
      ? '拉 A 弦和 D 弦长弓，每弦4拍'
      : '四根弦都拉长弓，每弦4拍',
    bpm: 50,
    completed: false,
  });

  // 2. Exercises from lesson
  const exerciseMinutesPool = totalTarget - 3; // minus warmup(2) + cooldown(1)
  const totalEstimated = lesson.exercises.reduce((sum, ex) => sum + ex.estimatedMinutes, 0);

  lesson.exercises.forEach(exercise => {
    const ratio = exercise.estimatedMinutes / totalEstimated;
    const minutes = Math.round(ratio * exerciseMinutesPool);
    const progression = exercise.progression?.[dayKey] || {};

    const section = {
      id: exercise.id,
      type: 'exercise',
      exerciseType: exercise.type,
      title: exercise.title,
      titleEn: exercise.titleEn,
      icon: exercise.type === 'piece' ? '🎶' : '🎵',
      durationMinutes: Math.max(minutes, 2),
      description: exercise.description,
      focus: progression.focus || '',
      completed: false,
    };

    // Type-specific fields
    if (exercise.type === 'open-strings') {
      section.strings = exercise.strings;
      section.bpm = progression.bpm || exercise.bpm;
      section.beatsPerString = exercise.beatsPerString;
    } else if (exercise.type === 'piece') {
      section.measures = exercise.measures;
      section.timeSignature = exercise.timeSignature;
      section.bpm = Math.round(exercise.bpm * (progression.bpmFactor || 1));
      section.baseBpm = exercise.bpm;
      section.bpmFactor = progression.bpmFactor || 1;
      section.mode = progression.mode || 'arco';
      section.playModes = exercise.playModes;
    }

    sections.push(section);
  });

  // 3. Cool-down (fixed 1 min)
  sections.push({
    id: 'cooldown',
    type: 'cooldown',
    title: '放松',
    icon: '🌙',
    durationMinutes: 1,
    description: '拉一个 A 弦长弓，深呼吸放松',
    completed: false,
  });

  const totalMinutes = sections.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    dayNumber,
    theme: DAY_THEMES[dayNumber] || '',
    totalMinutes,
    sections,
    lessonTitle: lesson.title,
    teacherNotes: lesson.teacherNotes,
  };
}

/**
 * Get a formatted date string for a practice day.
 */
export function getPracticeDateStr(lessonDay, weekOf, dayNumber) {
  const start = new Date(weekOf);
  start.setDate(start.getDate() + dayNumber - 1);
  return start.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

/**
 * Get all 7 days overview for the week plan view.
 */
export function getWeekOverview(lesson) {
  const days = [];
  for (let d = 1; d <= 7; d++) {
    const plan = generateDailyPlan(lesson, d);
    const dateObj = new Date(lesson.weekOf);
    dateObj.setDate(dateObj.getDate() + d - 1);
    days.push({
      dayNumber: d,
      date: dateObj,
      theme: plan.theme,
      totalMinutes: plan.totalMinutes,
      sectionCount: plan.sections.length,
      sections: plan.sections.map(s => ({ id: s.id, title: s.title, focus: s.focus })),
    });
  }
  return days;
}
