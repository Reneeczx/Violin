import State from './state.js';
import { getWeekOverview } from './practice-plan.js';
import {
  buildPublishedLessonHistory,
  getPublishedWeekPackages,
  GENERATION_PROVIDER,
} from './week-package-store.js';

const REQUIRED_DAY_KEYS = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
const ALLOWED_PLAN_KINDS = new Set(['lesson', 'review']);
const ALLOWED_DAY_STATUSES = new Set(['planned', 'inactive', 'catchup']);
const ALLOWED_EXERCISE_TYPES = new Set(['open-strings', 'piece']);
const DEFAULT_PLANNER_ROLE = {
  title: 'Beginner Violin Weekly Practice Planner',
  mission: 'Turn the weekly teacher brief, recent lesson continuity, and available score materials into a calm 7-day home practice package.',
  primaryAudience: 'beginner child violin student',
  secondaryAudience: 'parent or caregiver supporting home practice',
};
const DEFAULT_STUDENT_PROFILE = {
  stage: 'early beginner',
  learningContext: 'one weekly lesson plus short home practice sessions',
  currentAbilities: [
    'open-string practice',
    'slow rhythm counting',
    'intro-level beginner piece work',
    'basic tempo following with strong guidance',
  ],
  supportNeeds: [
    'clear daily focus',
    'limited novelty per day',
    'simple language that both student and parent can follow',
  ],
  commonFailureModes: [
    'too much new content in one day causes overload',
    'speed rises before rhythm is stable',
    'rests and counting are skipped unless explicitly reinforced',
  ],
};
const RUNTIME_PRACTICE_BUDGET = {
  activeDayTargetMinutes: 12,
  warmupMinutes: 2,
  cooldownMinutes: 1,
  exercisePoolMinutes: 9,
  minimumExerciseMinutes: 2,
  budgetSource: 'runtime-fixed-v1',
  note: 'The current runtime generates roughly 12 minutes for each active day. Keep the authored week package compatible with that budget.',
};
const DEFAULT_PLANNING_POLICY = {
  weeklyArc: [
    'early week: orient and stabilize',
    'mid week: reinforce and correct',
    'late week: connect sections and build confidence',
  ],
  dayStructure: [
    'always assume a short warmup, one or two core tasks, then a short cooldown',
    'tie each active day to one clear practice focus',
    'prefer consistency over speed increases',
  ],
  contentRules: [
    'do not introduce too many new ideas in one week',
    'keep titles and focus text concrete and parent-readable',
    'if rhythm or rests are weak, slow down before adding speed',
  ],
  reviewWeekRules: [
    'prioritize incomplete items first',
    'keep one confidence-building item in the week',
    'do not turn a review week into a brand new lesson week',
  ],
};
const OUTPUT_QUALITY_BAR = [
  'keep the language suitable for beginner violin students and parents',
  'make titles concise and practical',
  'make each active day trace back to one of the weekly goals',
  'do not invent unsupported techniques or new exercise types',
];
const COACHING_FOCUS_RULES = [
  {
    key: 'rests',
    keywords: ['休止', 'rest', '数拍', '停拍'],
    focus: '先把休止和数拍说清楚',
    rationale: '当前材料里涉及休止或数拍时，孩子最容易在真正拉琴时直接跳过停顿。',
    coachingCue: '先拍手或口数一遍，再开始拨弦或拉弓。',
  },
  {
    key: 'rhythm',
    keywords: ['节奏', '拍子', 'rhythm', '节拍'],
    focus: '先稳节奏，再谈速度',
    rationale: '初学阶段最常见的问题是速度先上去，节拍却还没有真正稳住。',
    coachingCue: '如果连续两遍节拍不稳，就先降速或改成拍手版本。',
  },
  {
    key: 'tempo',
    keywords: ['速度', 'tempo', '提速', '快一点', '快'],
    focus: '提速前先确认拍点和动作都稳定',
    rationale: '本周一旦涉及提速，容易把原本已经会的基础动作拉散。',
    coachingCue: '先在当前速度连续做对两遍，再决定要不要加一点速度。',
  },
  {
    key: 'string-crossing',
    keywords: ['换弦', 'string crossing'],
    focus: '换弦时先保声音均匀，再求连贯',
    rationale: '多音高或多弦内容最容易在换弦时丢掉节拍和发音质量。',
    coachingCue: '先做慢速换弦，确认每一下都落在拍点里。',
  },
  {
    key: 'bowing',
    keywords: ['拉弓', '弓子', 'arco'],
    focus: '拉弓先均匀，再追求完整乐句',
    rationale: '初学者一旦急着把句子拉完整，弓速和发音通常会先变乱。',
    coachingCue: '把每一拍先拉稳、拉匀，再尝试把小节连起来。',
  },
  {
    key: 'pizzicato',
    keywords: ['拨弦', 'pizz'],
    focus: '先用拨弦把节拍和音高确认清楚',
    rationale: '拨弦是更低负荷的确认方式，适合先把节拍和音高做对。',
    coachingCue: '先拨弦做对，再决定是否切回拉弓。',
  },
];

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampPercentage(rate) {
  return Math.max(0, Math.min(100, Math.round(rate * 100)));
}

function splitTeacherBrief(teacherBrief) {
  return String(teacherBrief || '')
    .replace(/^本周重点[:：]\s*/u, '')
    .split(/[\n，,。；;、]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function dedupeGoalHints(goalHints) {
  const seen = new Set();
  return goalHints.filter((item) => {
    const key = String(item.goal || '').toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getTrackingData(weekOf) {
  return State.getWeekTracking(weekOf);
}

function getExerciseActiveDayCount(exercise) {
  return REQUIRED_DAY_KEYS.filter((dayKey) => exercise.progression?.[dayKey]?.status !== 'inactive').length;
}

function getExerciseCompletionRate(lessonEntry, exercise) {
  const tracking = getTrackingData(lessonEntry.weekOf);
  const activeDayCount = getExerciseActiveDayCount(exercise);
  if (!activeDayCount) {
    return 0;
  }

  let completedCount = 0;
  for (let dayNumber = 1; dayNumber <= 7; dayNumber += 1) {
    const dayKey = `day${dayNumber}`;
    if (exercise.progression?.[dayKey]?.status === 'inactive') {
      continue;
    }

    if (tracking.days?.[dayNumber]?.sections?.[exercise.id]?.completed) {
      completedCount += 1;
    }
  }

  return Number((completedCount / activeDayCount).toFixed(2));
}

function buildWeekSummary(lessonEntry) {
  const tracking = getTrackingData(lessonEntry.weekOf);
  const completedDays = Object.keys(tracking.days || {})
    .filter((dayNumber) => tracking.days[dayNumber]?.completedAt)
    .map(Number);
  const dailyMinutes = getWeekOverview(lessonEntry)
    .filter((day) => day.dayStatus !== 'inactive' && day.totalMinutes > 0)
    .map((day) => day.totalMinutes);

  return {
    weekOf: lessonEntry.weekOf,
    title: lessonEntry.title || '(untitled)',
    sourceKind: lessonEntry.historySource || 'published-package',
    planKind: lessonEntry.planKind || 'lesson',
    publishedFromDayNumber: lessonEntry.publishedFromDayNumber || 1,
    completedDays,
    completionRate: Number((completedDays.length / 7).toFixed(2)),
    dailyMinutes,
    exerciseTitles: (lessonEntry.exercises || []).map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      completionRate: getExerciseCompletionRate(lessonEntry, exercise),
    })),
    teacherBrief: lessonEntry.teacherBrief || lessonEntry.teacherNotes || '',
  };
}

function buildReviewCandidates(lessonEntries) {
  const candidates = [];

  lessonEntries.forEach((lessonEntry) => {
    const exercises = lessonEntry.exercises || [];
    exercises.forEach((exercise) => {
      candidates.push({
        weekOf: lessonEntry.weekOf,
        exerciseId: exercise.id,
        title: exercise.title,
        type: exercise.type,
        completionRate: getExerciseCompletionRate(lessonEntry, exercise),
      });
    });
  });

  return candidates
    .sort((left, right) => left.completionRate - right.completionRate)
    .slice(0, 6)
    .map((candidate) => ({
      ...candidate,
      reason: candidate.completionRate <= 0.4
        ? 'Low completion rate'
        : 'Recent foundation item',
    }));
}

function buildWeeklyGoalHints(weekPackage, weekSummaries, reviewCandidates) {
  const hints = splitTeacherBrief(weekPackage.teacherBrief).map((goal) => ({
    goal,
    source: 'teacher-brief',
  }));

  if (weekPackage.planKind === 'review') {
    reviewCandidates.slice(0, 3).forEach((candidate) => {
      hints.push({
        goal: `Reinforce ${candidate.title}`,
        source: 'review-candidate',
      });
    });
  } else {
    const weakestItems = reviewCandidates.slice(0, 2);
    weakestItems.forEach((candidate) => {
      hints.push({
        goal: `Carry over ${candidate.title} with steadier consistency`,
        source: 'carry-over',
      });
    });
  }

  if (!hints.length && weekSummaries[0]) {
    weekSummaries[0].exerciseTitles.slice(0, 2).forEach((exercise) => {
      hints.push({
        goal: `Keep building confidence in ${exercise.title}`,
        source: 'recent-week',
      });
    });
  }

  return dedupeGoalHints(hints).slice(0, 3);
}

function buildCarryOverContext(weekSummaries, reviewCandidates) {
  const latestWeek = weekSummaries[0] || null;
  const continuingStrengths = (latestWeek?.exerciseTitles || [])
    .filter((exercise) => exercise.completionRate >= 0.75)
    .slice(0, 2)
    .map((exercise) => exercise.title);

  const needsReinforcement = reviewCandidates
    .slice(0, 3)
    .map((candidate) => ({
      title: candidate.title,
      reason: candidate.reason,
      completionRatePercent: clampPercentage(candidate.completionRate),
    }));

  return {
    latestReferenceWeek: latestWeek
      ? {
          weekOf: latestWeek.weekOf,
          title: latestWeek.title,
          sourceKind: latestWeek.sourceKind,
        }
      : null,
    continuingStrengths,
    needsReinforcement,
  };
}

function buildPracticeBudget(weekSummaries) {
  const recentMinutes = weekSummaries.flatMap((weekSummary) => weekSummary.dailyMinutes || []);
  const observedAverageMinutes = recentMinutes.length
    ? Math.round(recentMinutes.reduce((sum, value) => sum + value, 0) / recentMinutes.length)
    : RUNTIME_PRACTICE_BUDGET.activeDayTargetMinutes;

  return {
    ...RUNTIME_PRACTICE_BUDGET,
    observedAverageMinutes,
  };
}

function collectLearningSignals(lessonEntries) {
  const timeSignatures = new Set();
  const uniquePitches = new Set();
  const coverage = new Set();
  const rawChallenges = new Set();
  let openStringCount = 0;
  let pieceCount = 0;
  let restCount = 0;
  let stringCrossingPieceCount = 0;
  let maxBpm = 0;

  lessonEntries.forEach((lessonEntry) => {
    (lessonEntry.exercises || []).forEach((exercise) => {
      if (exercise.type === 'open-strings') {
        openStringCount += 1;
        coverage.add('空弦基础');
      }

      if (exercise.type === 'piece') {
        pieceCount += 1;
        coverage.add('简单曲目');
        maxBpm = Math.max(maxBpm, Number(exercise.bpm) || 0);

        if (Array.isArray(exercise.timeSignature) && exercise.timeSignature.length === 2) {
          const signature = `${exercise.timeSignature[0]}/${exercise.timeSignature[1]}`;
          timeSignatures.add(signature);
          coverage.add(`${signature} 拍号`);
        }

        const measurePitchSet = new Set();
        (exercise.measures || []).forEach((measure) => {
          (measure.notes || []).forEach((note) => {
            if (note.pitch === 'REST') {
              restCount += 1;
              coverage.add('休止符与数拍');
              rawChallenges.add('休止和数拍容易在真正演奏时被跳过');
              return;
            }

            if (note.pitch) {
              uniquePitches.add(note.pitch);
              measurePitchSet.add(note.pitch);
            }
          });
        });

        if (measurePitchSet.size > 1) {
          stringCrossingPieceCount += 1;
          coverage.add('换弦与音高切换');
          rawChallenges.add('换弦时容易牺牲声音均匀和拍点稳定');
        }

        if (Array.isArray(exercise.playModes) && exercise.playModes.includes('arco')) {
          coverage.add('基础拉弓');
          rawChallenges.add('拉弓一快起来，动作和发音容易同时变散');
        }

        if (Array.isArray(exercise.playModes) && exercise.playModes.includes('pizzicato')) {
          coverage.add('拨弦确认');
        }
      } else {
        maxBpm = Math.max(maxBpm, Number(exercise.bpm) || 0);
      }
    });
  });

  if (maxBpm > 0) {
    coverage.add(`慢速到 ${maxBpm} BPM 节拍跟随`);
  }
  if (maxBpm >= 72) {
    rawChallenges.add('提速往往会早于节奏真正稳定');
  }

  return {
    referenceWeekCount: lessonEntries.length,
    openStringCount,
    pieceCount,
    restCount,
    hasRests: restCount > 0,
    uniquePitchCount: uniquePitches.size,
    stringCrossingPieceCount,
    maxBpm,
    timeSignatures: [...timeSignatures],
    coverage: [...coverage],
    rawChallenges: [...rawChallenges],
  };
}

function inferStage(learningSignals) {
  if (learningSignals.referenceWeekCount <= 1 && learningSignals.pieceCount === 0) {
    return {
      stageKey: 'startup',
      stageLabel: '起步期',
    };
  }

  if (!learningSignals.hasRests && learningSignals.pieceCount <= 1 && learningSignals.uniquePitchCount <= 4) {
    return {
      stageKey: 'open-string-foundation',
      stageLabel: '空弦巩固期',
    };
  }

  if (learningSignals.hasRests || learningSignals.timeSignatures.length > 1 || learningSignals.maxBpm >= 72) {
    return {
      stageKey: 'rhythm-entry',
      stageLabel: '节奏入门期',
    };
  }

  return {
    stageKey: 'simple-repertoire',
    stageLabel: '简单曲目期',
  };
}

function getConsistencyLabel(averageCompletionRatePercent) {
  if (averageCompletionRatePercent == null) {
    return '暂无完成数据';
  }
  if (averageCompletionRatePercent >= 75) {
    return '较稳定';
  }
  if (averageCompletionRatePercent >= 45) {
    return '波动中';
  }
  return '需要更多支撑';
}

function buildLearningProfile(lessonEntries, weekSummaries, practiceBudget) {
  const learningSignals = collectLearningSignals(lessonEntries);
  const completionWeeks = weekSummaries.filter(
    (weekSummary) => !(weekSummary.sourceKind === 'embedded-baseline' && weekSummary.completedDays.length === 0),
  );
  const averageCompletionRatePercent = completionWeeks.length
    ? Math.round(average(completionWeeks.map((weekSummary) => clampPercentage(weekSummary.completionRate))))
    : null;
  const publishedWeekCount = weekSummaries.filter((weekSummary) => weekSummary.sourceKind === 'published-package').length;
  const observedAverageMinutes = practiceBudget.observedAverageMinutes;
  const { stageKey, stageLabel } = inferStage(learningSignals);
  const currentChallenges = [...learningSignals.rawChallenges];

  if (!currentChallenges.length) {
    currentChallenges.push('当前更适合保持低认知负荷，不要在同一天加入太多新内容');
  }

  return {
    stageKey,
    stageLabel,
    learnedWeekCount: Math.max(learningSignals.referenceWeekCount, weekSummaries.length),
    publishedWeekCount,
    averageCompletionRatePercent,
    consistencyLabel: getConsistencyLabel(averageCompletionRatePercent),
    observedAverageMinutes,
    currentCoverage: learningSignals.coverage.length
      ? learningSignals.coverage
      : ['空弦基础', '短时家庭练习'],
    currentChallenges: currentChallenges.slice(0, 4),
    summary: `已累计参考 ${Math.max(learningSignals.referenceWeekCount, weekSummaries.length)} 个最近学习周，当前更接近「${stageLabel}」。近几周主要覆盖 ${learningSignals.coverage.slice(0, 3).join('、') || '空弦基础'}，适合继续用短时、低负荷、每日 focus 明确的方式推进。`,
    evidence: [
      averageCompletionRatePercent == null
        ? '近几周还没有可用的完成记录'
        : `近几周平均完成度约 ${averageCompletionRatePercent}%`,
      `当前运行时活跃日约 ${observedAverageMinutes} 分钟`,
      learningSignals.hasRests ? '最近内容已经涉及休止符与数拍' : '最近内容仍以基础节拍和空弦为主',
      learningSignals.stringCrossingPieceCount > 0
        ? '最近曲目已出现换弦或多音高切换'
        : '最近曲目仍以低复杂度切换为主',
    ],
    signals: learningSignals,
  };
}

function buildDynamicStudentProfile(learningProfile, confirmedCoachingFocus) {
  const currentAbilities = [];
  if (learningProfile.currentCoverage.some((item) => item.includes('空弦'))) {
    currentAbilities.push('open-string setup and steady bow preparation');
  }
  if (learningProfile.currentCoverage.some((item) => item.includes('简单曲目'))) {
    currentAbilities.push('intro-level piece practice with short phrases');
  }
  if (learningProfile.currentCoverage.some((item) => item.includes('休止'))) {
    currentAbilities.push('basic rest counting with explicit prompting');
  }
  if (learningProfile.currentCoverage.some((item) => item.includes('换弦'))) {
    currentAbilities.push('slow string-crossing and pitch switching');
  }
  if (!currentAbilities.length) {
    currentAbilities.push('short guided beginner violin sessions');
  }

  const supportNeeds = [
    'clear daily focus',
    'simple language that both student and parent can follow',
  ];
  if (learningProfile.consistencyLabel !== '较稳定') {
    supportNeeds.push('low cognitive load with only one main correction at a time');
  }
  if (learningProfile.averageCompletionRatePercent != null && learningProfile.averageCompletionRatePercent < 50) {
    supportNeeds.push('short wins and gentle catchup instead of aggressive escalation');
  }

  const commonFailureModes = [
    'speed rises before rhythm is stable',
    ...learningProfile.currentChallenges.map((item) => item.replace(/[。.]$/u, '')),
  ].slice(0, 4);

  return {
    ...DEFAULT_STUDENT_PROFILE,
    stage: learningProfile.stageLabel,
    learningContext: `${learningProfile.learnedWeekCount} recent reference week(s), short home practice blocks, parent-supported follow-through`,
    currentAbilities,
    supportNeeds: [...new Set(supportNeeds)].slice(0, 4),
    commonFailureModes: [...new Set(commonFailureModes)].slice(0, 4),
    currentFocusAreas: confirmedCoachingFocus.map((item) => item.focus),
  };
}

function buildTeacherFocusSuggestions(teacherBrief) {
  const normalizedBrief = String(teacherBrief || '').toLowerCase();
  const suggestions = [];

  COACHING_FOCUS_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => normalizedBrief.includes(keyword.toLowerCase()))) {
      suggestions.push({
        focus: rule.focus,
        source: 'teacher-brief',
        rationale: `来自老师要求：${rule.rationale}`,
        coachingCue: rule.coachingCue,
      });
    }
  });

  if (!suggestions.length) {
    splitTeacherBrief(teacherBrief).slice(0, 2).forEach((goal) => {
      suggestions.push({
        focus: goal,
        source: 'teacher-brief',
        rationale: '直接来自老师本周给出的重点要求。',
        coachingCue: '把这条要求拆成一个能在今天练完后被观察到的小目标。',
      });
    });
  }

  return suggestions;
}

function buildHistoryFocusSuggestions(reviewCandidates) {
  return reviewCandidates.slice(0, 2).map((candidate) => ({
    focus: `继续补稳「${candidate.title}」`,
    source: 'history-low-completion',
    rationale: `近几周这项内容完成度约 ${clampPercentage(candidate.completionRate)}%，仍需要继续巩固。`,
    coachingCue: candidate.type === 'open-strings'
      ? '先追求音色和拍点稳定，再考虑加快。'
      : '先把短句做对，再把小节连起来。',
  }));
}

function buildSignalFocusSuggestions(learningProfile) {
  const suggestions = [];
  const coverageText = learningProfile.currentCoverage.join(' ');

  if (coverageText.includes('休止') || learningProfile.currentChallenges.some((item) => item.includes('休止'))) {
    suggestions.push({
      focus: '先把休止和数拍说出来，再开始演奏',
      source: 'recent-score-pattern',
      rationale: '最近内容已经涉及休止符或明确的停顿节拍，先说清楚比直接拉更稳。',
      coachingCue: '先拍手或口数一遍，再回到乐器上。',
    });
  }

  if (coverageText.includes('换弦')) {
    suggestions.push({
      focus: '换弦时优先守住声音均匀和拍点',
      source: 'recent-score-pattern',
      rationale: '一旦开始多音高或多弦切换，节拍和发音最容易同时散掉。',
      coachingCue: '把速度降下来，先确认每次换弦都落在正确拍点。',
    });
  }

  if (learningProfile.averageCompletionRatePercent < 50) {
    suggestions.push({
      focus: '每天只盯一个最重要的改进点',
      source: 'learning-profile',
      rationale: '当前完成稳定度还不高，过多目标会明显增加家庭练习负担。',
      coachingCue: '今天做对一个点就算达标，不急着同时修很多问题。',
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      focus: '继续保持低负荷、明确 focus 的日练节奏',
      source: 'learning-profile',
      rationale: '当前最重要的是把已有基础稳住，而不是快速叠加新内容。',
      coachingCue: '每天只安排一到两个核心任务，确保能看见完成感。',
    });
  }

  return suggestions;
}

function dedupeCoachingFocus(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.focus || '').trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeManualCoachingFocus(manualCoachingFocus) {
  if (!Array.isArray(manualCoachingFocus)) {
    return [];
  }

  return manualCoachingFocus
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildSuggestedCoachingFocus(weekPackage, reviewCandidates, learningProfile) {
  return dedupeCoachingFocus([
    ...buildTeacherFocusSuggestions(weekPackage.teacherBrief),
    ...buildHistoryFocusSuggestions(reviewCandidates),
    ...buildSignalFocusSuggestions(learningProfile),
  ]).slice(0, 4);
}

function buildConfirmedCoachingFocus(weekPackage, suggestedCoachingFocus) {
  const manualCoachingFocus = normalizeManualCoachingFocus(weekPackage.manualCoachingFocus);
  if (manualCoachingFocus.length) {
    return manualCoachingFocus.map((focus) => ({
      focus,
      source: 'builder-adjusted',
    }));
  }

  return suggestedCoachingFocus.map((item) => ({
    focus: item.focus,
    source: item.source,
  }));
}

function formatList(items, fallback = '- (none)') {
  if (!items?.length) {
    return fallback;
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function formatGoalHints(goalHints) {
  if (!goalHints.length) {
    return '- Infer 1-3 concrete weekly goals from the teacher brief and carry-over context.';
  }

  return goalHints
    .map((item) => `- ${item.goal} [source: ${item.source}]`)
    .join('\n');
}

function formatWeekSummaries(weekSummaries) {
  if (!weekSummaries.length) {
    return '- No prior published or baseline week context is available.';
  }

  return weekSummaries.map((weekSummary) => {
    const exerciseLabels = weekSummary.exerciseTitles
      .map((exercise) => `${exercise.title} (${clampPercentage(exercise.completionRate)}%)`)
      .join(', ');
    return `- ${weekSummary.weekOf} | ${weekSummary.title} | source=${weekSummary.sourceKind} | completedDays=${weekSummary.completedDays.length}/7 | exercises=${exerciseLabels}`;
  }).join('\n');
}

function formatCoachingFocus(items) {
  if (!items?.length) {
    return '- (none)';
  }

  return items.map((item) => {
    const cueSuffix = item.coachingCue ? ` | cue: ${item.coachingCue}` : '';
    const rationaleSuffix = item.rationale ? ` | why: ${item.rationale}` : '';
    return `- ${item.focus} [source: ${item.source}]${rationaleSuffix}${cueSuffix}`;
  }).join('\n');
}

function getRelevantPublishedWeeks(currentWeekOf) {
  const fallbackLesson = globalThis.window?.EMBEDDED_CURRENT_LESSON || globalThis.window?.CURRENT_LESSON || null;
  const history = buildPublishedLessonHistory(
    fallbackLesson,
    new Date(`${currentWeekOf}T12:00:00`),
    getPublishedWeekPackages(),
  ).filter((lesson) => lesson.weekOf !== currentWeekOf);

  const desiredCount = Math.min(4, Math.max(2, history.length));
  return history.slice(0, desiredCount || history.length);
}

export function validateWeekPackage(weekPackage) {
  const errors = [];

  if (!weekPackage || typeof weekPackage !== 'object') {
    return ['Week package must be a JSON object'];
  }

  if (!weekPackage.weekOf) {
    errors.push('Missing top-level weekOf');
  }

  if (!ALLOWED_PLAN_KINDS.has(weekPackage.planKind)) {
    errors.push('planKind must be lesson or review');
  }

  if (!weekPackage.status) {
    errors.push('Missing top-level status');
  }

  if (weekPackage.publishedFromDayNumber == null) {
    errors.push('Missing publishedFromDayNumber');
  }

  if (!weekPackage.generationProvider) {
    errors.push('Missing generationProvider');
  }

  if (!Array.isArray(weekPackage.sourceAssets)) {
    errors.push('sourceAssets must be an array');
  }

  if (!weekPackage.generatedLesson || typeof weekPackage.generatedLesson !== 'object') {
    errors.push('Missing generatedLesson');
    return errors;
  }

  const lesson = weekPackage.generatedLesson;
  if (!lesson.weekOf) {
    errors.push('generatedLesson.weekOf is required');
  }
  if (lesson.lessonDay == null) {
    errors.push('generatedLesson.lessonDay is required');
  }
  if (!lesson.title) {
    errors.push('generatedLesson.title is required');
  }
  if (lesson.teacherNotes == null) {
    errors.push('generatedLesson.teacherNotes is required');
  }
  if (!Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
    errors.push('generatedLesson.exercises must contain at least one exercise');
  }

  (lesson.exercises || []).forEach((exercise, exerciseIndex) => {
    const prefix = `generatedLesson.exercises[${exerciseIndex}]`;
    if (!exercise.id) {
      errors.push(`${prefix}.id is required`);
    }
    if (!ALLOWED_EXERCISE_TYPES.has(exercise.type)) {
      errors.push(`${prefix}.type must be open-strings or piece`);
    }
    if (!exercise.title) {
      errors.push(`${prefix}.title is required`);
    }
    if (!exercise.progression || typeof exercise.progression !== 'object') {
      errors.push(`${prefix}.progression is required`);
    }

    REQUIRED_DAY_KEYS.forEach((dayKey) => {
      const dayConfig = exercise.progression?.[dayKey];
      if (!dayConfig || typeof dayConfig !== 'object') {
        errors.push(`${prefix}.progression.${dayKey} is required`);
        return;
      }

      if (dayConfig.status && !ALLOWED_DAY_STATUSES.has(dayConfig.status)) {
        errors.push(`${prefix}.progression.${dayKey}.status must be planned, inactive, or catchup`);
      }
    });

    if (exercise.type === 'open-strings') {
      if (!Array.isArray(exercise.strings) || exercise.strings.length === 0) {
        errors.push(`${prefix}.strings is required for open-strings`);
      }
      if (exercise.beatsPerString == null) {
        errors.push(`${prefix}.beatsPerString is required for open-strings`);
      }
      if (exercise.bpm == null) {
        errors.push(`${prefix}.bpm is required for open-strings`);
      }
    }

    if (exercise.type === 'piece') {
      if (!Array.isArray(exercise.measures) || exercise.measures.length === 0) {
        errors.push(`${prefix}.measures is required for piece`);
      }
      if (!Array.isArray(exercise.timeSignature) || exercise.timeSignature.length !== 2) {
        errors.push(`${prefix}.timeSignature must be a [top, bottom] tuple`);
      }
      if (exercise.bpm == null) {
        errors.push(`${prefix}.bpm is required for piece`);
      }
    }
  });

  return errors;
}

export function buildWeekManifest(weekPackage) {
  const relatedWeeks = getRelevantPublishedWeeks(weekPackage.weekOf);
  const weekSummaries = relatedWeeks.map(buildWeekSummary);
  const reviewCandidates = buildReviewCandidates(relatedWeeks);
  const practiceBudget = buildPracticeBudget(weekSummaries);
  const learningProfile = buildLearningProfile(relatedWeeks, weekSummaries, practiceBudget);
  const suggestedCoachingFocus = buildSuggestedCoachingFocus(weekPackage, reviewCandidates, learningProfile);
  const confirmedCoachingFocus = buildConfirmedCoachingFocus(weekPackage, suggestedCoachingFocus);
  const weeklyGoalHints = buildWeeklyGoalHints(weekPackage, weekSummaries, reviewCandidates);
  const carryOverContext = buildCarryOverContext(weekSummaries, reviewCandidates);

  return {
    schemaVersion: 1,
    manifestType: 'violin-week-context',
    generationProvider: GENERATION_PROVIDER,
    weekOf: weekPackage.weekOf,
    planKind: weekPackage.planKind,
    lessonDay: 1,
    publishedFromDayNumber: weekPackage.publishedFromDayNumber,
    teacherBrief: weekPackage.teacherBrief || '',
    sourceAssets: weekPackage.sourceAssets || [],
    plannerRole: DEFAULT_PLANNER_ROLE,
    learningProfile,
    studentProfile: buildDynamicStudentProfile(learningProfile, confirmedCoachingFocus),
    practiceBudget,
    weeklyGoalHints,
    suggestedCoachingFocus,
    confirmedCoachingFocus,
    carryOverContext,
    planningPolicy: {
      ...DEFAULT_PLANNING_POLICY,
      reviewWeekRules: weekPackage.planKind === 'review'
        ? DEFAULT_PLANNING_POLICY.reviewWeekRules
        : [],
    },
    recentPublishedWeeks: weekSummaries,
    reviewCandidates,
    outputQualityBar: OUTPUT_QUALITY_BAR,
    outputContract: {
      filename: 'week-package.json',
      requiredTopLevelFields: [
        'weekOf',
        'status',
        'planKind',
        'publishedAt',
        'publishedFromDayNumber',
        'teacherBrief',
        'sourceAssets',
        'generationProvider',
        'generationMeta',
        'generatedLesson',
      ],
      allowedExerciseTypes: ['open-strings', 'piece'],
      allowedDayStatuses: ['planned', 'inactive', 'catchup'],
    },
  };
}

export function buildCodexPrompt(manifest) {
  return [
    '# Violin Weekly Package Generator',
    '',
    'You are generating a strict `week-package.json` for the Violin practice app.',
    'Return JSON only. Do not wrap it in markdown. Do not add explanations.',
    '',
    '## Role',
    `- Title: ${manifest.plannerRole.title}`,
    `- Mission: ${manifest.plannerRole.mission}`,
    `- Primary audience: ${manifest.plannerRole.primaryAudience}`,
    `- Secondary audience: ${manifest.plannerRole.secondaryAudience}`,
    '',
    '## Learning Profile',
    `- Stage label: ${manifest.learningProfile.stageLabel}`,
    `- Stage key: ${manifest.learningProfile.stageKey}`,
    `- Learned week count: ${manifest.learningProfile.learnedWeekCount}`,
    `- Published week count on this device: ${manifest.learningProfile.publishedWeekCount}`,
    `- Average completion rate percent: ${manifest.learningProfile.averageCompletionRatePercent == null ? 'not available yet' : manifest.learningProfile.averageCompletionRatePercent}`,
    `- Consistency label: ${manifest.learningProfile.consistencyLabel}`,
    `- Observed average minutes: ${manifest.learningProfile.observedAverageMinutes}`,
    `- Summary: ${manifest.learningProfile.summary}`,
    '- Current coverage:',
    formatList(manifest.learningProfile.currentCoverage),
    '- Current challenges:',
    formatList(manifest.learningProfile.currentChallenges),
    '- Evidence:',
    formatList(manifest.learningProfile.evidence),
    '',
    '## Student Profile',
    `- Stage: ${manifest.studentProfile.stage}`,
    `- Learning context: ${manifest.studentProfile.learningContext}`,
    '- Current abilities:',
    formatList(manifest.studentProfile.currentAbilities),
    '- Support needs:',
    formatList(manifest.studentProfile.supportNeeds),
    '- Common failure modes:',
    formatList(manifest.studentProfile.commonFailureModes),
    '- Current focus areas:',
    formatList(manifest.studentProfile.currentFocusAreas),
    '',
    '## Practice Budget',
    `- Active day target minutes: ${manifest.practiceBudget.activeDayTargetMinutes}`,
    `- Warmup minutes: ${manifest.practiceBudget.warmupMinutes}`,
    `- Cooldown minutes: ${manifest.practiceBudget.cooldownMinutes}`,
    `- Exercise pool minutes: ${manifest.practiceBudget.exercisePoolMinutes}`,
    `- Minimum exercise minutes: ${manifest.practiceBudget.minimumExerciseMinutes}`,
    `- Observed recent average minutes: ${manifest.practiceBudget.observedAverageMinutes}`,
    `- Budget source: ${manifest.practiceBudget.budgetSource}`,
    `- Note: ${manifest.practiceBudget.note}`,
    '',
    '## Input Context',
    `- weekOf: ${manifest.weekOf}`,
    `- planKind: ${manifest.planKind}`,
    `- publishedFromDayNumber: ${manifest.publishedFromDayNumber}`,
    `- generationProvider: ${manifest.generationProvider}`,
    '',
    '## Teacher Brief',
    manifest.teacherBrief || '(empty)',
    '',
    '## Weekly Goal Hints',
    formatGoalHints(manifest.weeklyGoalHints),
    '',
    '## Suggested Coaching Focus',
    formatCoachingFocus(manifest.suggestedCoachingFocus),
    '',
    '## Confirmed Weekly Focus',
    formatCoachingFocus(manifest.confirmedCoachingFocus),
    '',
    '## Carry-Over Context',
    manifest.carryOverContext.latestReferenceWeek
      ? `- Latest reference week: ${manifest.carryOverContext.latestReferenceWeek.weekOf} | ${manifest.carryOverContext.latestReferenceWeek.title} | source=${manifest.carryOverContext.latestReferenceWeek.sourceKind}`
      : '- Latest reference week: none',
    '- Continuing strengths:',
    formatList(manifest.carryOverContext.continuingStrengths),
    '- Needs reinforcement:',
    manifest.carryOverContext.needsReinforcement.length
      ? manifest.carryOverContext.needsReinforcement.map((item) => `- ${item.title} | ${item.reason} | ${item.completionRatePercent}%`).join('\n')
      : '- (none)',
    '',
    '## Recent Week Summaries',
    formatWeekSummaries(manifest.recentPublishedWeeks),
    '',
    '## Planning Policy',
    '- Weekly arc:',
    formatList(manifest.planningPolicy.weeklyArc),
    '- Day structure:',
    formatList(manifest.planningPolicy.dayStructure),
    '- Content rules:',
    formatList(manifest.planningPolicy.contentRules),
    ...(manifest.planningPolicy.reviewWeekRules.length
      ? [
          '- Review week rules:',
          formatList(manifest.planningPolicy.reviewWeekRules),
        ]
      : []),
    '',
    '## Requirements',
    '- The top-level object must match the output contract in `week-manifest.json`.',
    '- Set `status` to `draft` and `publishedAt` to `null`.',
    `- Set \`generationProvider\` to \`${manifest.generationProvider}\`.`,
    '- `generatedLesson` must remain compatible with the existing practice runtime.',
    '- `generatedLesson.lessonDay` must be `1`.',
    '- Only use supported exercise types: `open-strings` and `piece`.',
    '- Every exercise must include `progression.day1` through `progression.day7`.',
    '- Each day may use `status: planned | inactive | catchup`.',
    '- Synthesize 1 to 3 concrete weekly goals internally and make each active day trace back to them.',
    '- Let the final day-to-day plan reflect the confirmed weekly focus, not just the raw teacher brief.',
    '- Keep active days compatible with the runtime budget of roughly 12 minutes.',
    '- Keep the plan appropriate for a beginner child plus parent support context.',
    '',
    '## Late Entry Rule',
    '- If `publishedFromDayNumber` is greater than 1, mark every earlier day as `inactive`.',
    '- Compress the meaningful work into the remaining days instead of pretending the week started on day 1.',
    '- Use `catchup` on compressed remaining days when that helps explain the intent.',
    '',
    '## Review Week Rule',
    '- If `planKind` is `review`, use the recent week context and review candidates to build a low-pressure consolidation week.',
    '- Prioritize incomplete work, repeated fundamentals, and one confidence-building item.',
    '',
    '## Original Score Handling',
    '- The uploaded source assets are the teacher materials. Preserve them in `sourceAssets` metadata.',
    '- The runtime score data must be represented inside `generatedLesson.exercises` as structured notation data.',
    '',
    '## Output Quality Bar',
    formatList(manifest.outputQualityBar),
    '',
    '## Self-check Before Final JSON',
    '- Does each active day stay within the runtime-friendly budget?',
    '- Are the weekly goals concrete and observable rather than vague?',
    '- Does each day focus on one clear improvement target?',
    '- Does the plan avoid too much novelty for a beginner?',
    '- Does the JSON still satisfy the strict output contract?',
    '',
    'Generate the JSON now.',
    '',
  ].join('\n');
}
