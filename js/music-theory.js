const DURATION_BEATS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

const REST_LABELS = {
  whole: '整休止',
  half: '二分休止',
  quarter: '四分休止',
  eighth: '八分休止',
  sixteenth: '十六分休止',
};

const STANDARD_SPEED_FACTORS = [0.5, 0.75, 1];

export const THEORY_TOPICS = [
  {
    id: 'tempo',
    title: '速度记号和节拍',
    summary: '看懂谱子里的 ♩=48、4/4、小节和节拍器。',
    bullets: [
      '♩=48 的意思是：以四分音符为一拍，每分钟 48 拍。',
      '四分音符可以先理解成“一拍的步子”。数字越大，步子越快。',
      '4/4 表示每小节 4 拍，而且每一拍都是一个四分音符。',
      '节拍器开到 48，就会每分钟响 48 下。如果谱子写 ♩=48，这两个速度应该对应起来。',
    ],
    examples: [
      '♩=48：很慢，适合边数拍边找弦。',
      '♩=80：接近原速，更像完整演奏。',
      '一小节就像一个小盒子，里面装满 4 拍；竖线就是小节线。',
    ],
  },
  {
    id: 'techniques',
    title: '拨弦、拉弓和表情术语',
    summary: '看懂 pizz.、arco、Ghostly 这些练习里常见的词。',
    bullets: [
      'pizz. 是 pizzicato 的缩写，表示用手指拨弦。',
      'arco 表示用弓演奏，和拨弦相对应。',
      'Ghostly 是表情提示，可以理解为像幽灵一样轻、神秘、安静。',
    ],
    examples: [
      '先写 pizz. 再写 arco，就是在同一段旋律里先拨弦后拉弓。',
      '看到 Ghostly 时，不一定更慢，但通常要更轻、更稳。',
    ],
  },
  {
    id: 'open-strings',
    title: '空弦和音名',
    summary: '知道什么是空弦，也知道 E / A / D / G 对应什么音。',
    bullets: [
      '空弦就是左手不按弦，直接拉或拨这根弦。',
      '小提琴四根空弦从高到低是 E、A、D、G。',
      '唱音名能帮助你把耳朵、手和弦的位置连起来。',
    ],
    examples: [
      'E 弦可以唱 Mi，A 弦唱 La，D 弦唱 Re，G 弦唱 Sol。',
      '先把空弦音色拉稳，以后按指才更容易准。',
    ],
  },
  {
    id: 'rests',
    title: '休止符',
    summary: '没声音不一定是坏了，有时只是谱子要求先休止。',
    bullets: [
      '休止符表示这几拍先不发声，但心里还要继续数拍。',
      '如果示范前面有休止，高亮会先走到休止符，然后才进入第一声音。',
      '能数稳休止，进入时机才会准。',
    ],
    examples: [
      '整休止：一整小节都安静。',
      '二分休止：在 4/4 里安静 2 拍。',
    ],
  },
];

function normalizeSpeedFactor(speedFactor = 1) {
  return Math.round(speedFactor * 100) / 100;
}

export function formatTempoMarking(bpm) {
  return `♩=${Math.round(bpm)}`;
}

export function formatSpeedLabel(speedFactor) {
  const normalized = normalizeSpeedFactor(speedFactor);
  return normalized === 1 ? '原速' : `${Math.round(normalized * 100)}%`;
}

export function getRecommendedSpeedLabel(speedFactor) {
  const normalized = normalizeSpeedFactor(speedFactor);
  return normalized === 1 ? '推荐 原速' : `推荐 ${Math.round(normalized * 100)}%`;
}

export function buildSpeedOptions(defaultSpeedFactor, standardFactors = STANDARD_SPEED_FACTORS) {
  const recommendedValue = normalizeSpeedFactor(defaultSpeedFactor || 1);
  const options = [
    { value: recommendedValue, label: getRecommendedSpeedLabel(recommendedValue), recommended: true },
  ];

  standardFactors.forEach((factor) => {
    const value = normalizeSpeedFactor(factor);
    if (value === recommendedValue) {
      return;
    }
    options.push({ value, label: formatSpeedLabel(value), recommended: false });
  });

  return options;
}

export function getEffectiveBpm(baseBpm, speedFactor = 1) {
  return Math.round(baseBpm * normalizeSpeedFactor(speedFactor));
}

export function getLeadingRestInfo(measures = [], bpm, speedFactor = 1) {
  let beats = 0;
  let noteCount = 0;

  for (const measure of measures) {
    for (const note of measure.notes || []) {
      if (note.pitch !== 'REST') {
        if (beats === 0) {
          return null;
        }

        const effectiveBpm = getEffectiveBpm(bpm, speedFactor);
        return {
          beats,
          noteCount,
          seconds: Number(((beats * 60) / effectiveBpm).toFixed(1)),
          tempoMarking: formatTempoMarking(effectiveBpm),
        };
      }

      beats += DURATION_BEATS[note.duration] || 1;
      noteCount += 1;
    }
  }

  return null;
}

export function getLeadingRestBreakdown(measures = [], bpm, speedFactor = 1) {
  const segments = [];

  for (const measure of measures) {
    for (const note of measure.notes || []) {
      if (note.pitch !== 'REST') {
        if (segments.length === 0) {
          return null;
        }

        const info = getLeadingRestInfo(measures, bpm, speedFactor);
        return {
          ...info,
          segments,
          breakdownText: segments.map((segment) => {
            const countLabel = `${segment.count}个`;
            const restLabel = REST_LABELS[segment.duration] || segment.duration;
            return `${countLabel}${restLabel}（${segment.beats}拍）`;
          }).join(' + '),
        };
      }

      const beats = DURATION_BEATS[note.duration] || 1;
      const previous = segments[segments.length - 1];
      if (previous?.duration === note.duration) {
        previous.count += 1;
        previous.beats += beats;
      } else {
        segments.push({ duration: note.duration, count: 1, beats });
      }
    }
  }

  return null;
}

export function describeTimeSignature(timeSignature = [4, 4]) {
  const [beatsPerMeasure, noteValue] = timeSignature;
  const unit = noteValue === 4
    ? '四分音符'
    : noteValue === 2
      ? '二分音符'
      : `${noteValue}分音符`;

  return `${beatsPerMeasure}/${noteValue} 表示每小节 ${beatsPerMeasure} 拍，每拍是一个${unit}。`;
}

export function getTheoryTopic(topicId = 'tempo') {
  return THEORY_TOPICS.find((topic) => topic.id === topicId) || THEORY_TOPICS[0];
}
