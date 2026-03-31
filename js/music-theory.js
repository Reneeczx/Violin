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

const NOTE_LABELS = {
  whole: '整音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
  sixteenth: '十六分音符',
};

const STANDARD_SPEED_FACTORS = [0.5, 0.75, 1];

export const THEORY_TOPICS = [
  {
    id: 'tempo',
    title: '速度记号和节拍',
    summary: '看懂谱子里的 `♩=48`、`4/4`、小节和节拍器。',
    bullets: [
      '`♩=48` 的意思是：以四分音符为一拍，每分钟 48 拍。',
      '数字越大，拍子越快；数字越小，你就有更多时间找弦和看谱。',
      '`4/4` 可以先理解成“每小节数 1 2 3 4”。',
      '节拍器速度和速度记号应该能对起来。',
    ],
    examples: [
      '`♩=48`：很慢，适合边数拍边找音。',
      '`♩=80`：更接近完整演奏时的速度。',
      '竖线把音乐分成一小格一小格，每一格就是一个小节。',
    ],
  },
  {
    id: 'techniques',
    title: '拨弦、拉弓和表情术语',
    summary: '看懂 `pizz.`、`arco`、`Ghostly` 这些练习里常见的词。',
    bullets: [
      '`pizz.` 是 `pizzicato` 的缩写，表示用手指拨弦。',
      '`arco` 表示用弓演奏，和拨弦相对。',
      '`Ghostly` 是表情提示，可以理解成轻一点、神秘一点。',
    ],
    examples: [
      '先写 `pizz.` 再写 `arco`，就是同一段旋律先拨再拉。',
      '看到 `Ghostly` 时，不一定更慢，但通常要更轻、更安静。',
    ],
  },
  {
    id: 'open-strings',
    title: '空弦和音名',
    summary: '知道什么是空弦，也知道 `E / A / D / G` 对应什么音。',
    bullets: [
      '空弦就是左手不按弦，直接拉或拨这一根弦。',
      '小提琴四根空弦从高到低是 `E / A / D / G`。',
      '唱音名可以帮助你把耳朵、手和弦的位置连起来。',
    ],
    examples: [
      '`E` 弦可以唱 `Mi`，`A` 弦唱 `La`，`D` 弦唱 `Re`，`G` 弦唱 `Sol`。',
      '先把空弦音色拉稳，以后按指才更容易准。',
    ],
  },
  {
    id: 'rests',
    title: '休止符',
    summary: '没声音不一定是坏了，有时只是谱子要求先休止。',
    bullets: [
      '休止符表示这里先不发声，但心里仍然要继续数拍。',
      '如果示范播放前面有休止，高亮会先走过休止，再进入第一个音。',
      '能数稳休止，进入时机才会准。',
    ],
    examples: [
      '整休止：一整小节都先安静。',
      '二分休止：在 4/4 里先安静 2 拍。',
    ],
  },
  {
    id: 'staff-basics',
    title: '五线谱基础',
    summary: '先看懂高音谱号、五条线和音为什么会放在线上或间里。',
    bullets: [
      '小提琴初学曲目通常使用高音谱号。',
      '音越高，通常写得越靠上；音越低，就会写得更靠下。',
      '超出五条线时，会用加线继续表示音高。',
    ],
    examples: [
      '高音谱号告诉你，这套五线谱要按小提琴常见的高音区来读。',
      '空弦 `G` 比 `D` 更低，所以在谱上会更靠下。',
    ],
  },
  {
    id: 'note-reading',
    title: '音符怎么读',
    summary: '看见音符时，先认它是什么音，再认它要占几拍。',
    bullets: [
      '音符的上下位置主要告诉你音高。',
      '音头、符干和时值样子会帮助你判断这个音该持续多久。',
      '高亮走到哪个音，就说明现在该把注意力放到哪个音上。',
    ],
    examples: [
      '四分音符通常先理解成 1 拍。',
      '半音符比四分音符更长，所以你要把弓留久一点。',
    ],
  },
  {
    id: 'time-signature',
    title: '拍号怎么读',
    summary: '先看每小节有几拍，再看每一拍按什么音符单位来数。',
    bullets: [
      '上面的数字告诉你每小节有几拍。',
      '下面的数字告诉你每一拍按什么音符单位数。',
      '对初学练习来说，先把 `4/4` 理解成“每小节数 1 2 3 4”就够了。',
    ],
    examples: [
      '`4/4`：每小节 4 拍，每一拍按四分音符来数。',
      '如果高亮从 1 走到 4，再回到 1，就说明进入下一小节了。',
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

export function getDurationLabel(duration) {
  return NOTE_LABELS[duration] || duration;
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
      : `${noteValue} 分音符`;

  return `${beatsPerMeasure}/${noteValue} 表示每小节 ${beatsPerMeasure} 拍，每拍是一个${unit}。`;
}

export function getTheoryTopic(topicId = 'tempo') {
  return THEORY_TOPICS.find((topic) => topic.id === topicId) || THEORY_TOPICS[0];
}

export function buildNotationExplainer(token, section, speedFactor = 1) {
  if (!token) {
    return null;
  }

  if (token.tokenType === 'clef') {
    return {
      title: '高音谱号',
      summary: '这段谱子使用的是高音谱号，表示我们按小提琴常见的高音区方式读谱。',
      bullets: [
        '先把它理解成“五线谱的起点”。',
        '后面音符的高低位置，都是在这个谱号规则下读出来的。',
      ],
      topicId: 'staff-basics',
      actionLabel: '深入了解五线谱',
    };
  }

  if (token.tokenType === 'time-signature') {
    const timeSignature = section?.timeSignature || token.timeSignature || [4, 4];
    return {
      title: `${timeSignature[0]}/${timeSignature[1]}`,
      summary: describeTimeSignature(timeSignature),
      bullets: [
        '先数清楚一小节里有几拍，再去拉音。',
        '在这首练习里，拍号决定了高亮每几拍进入下一小节。',
      ],
      topicId: 'time-signature',
      actionLabel: '深入了解拍号',
    };
  }

  if (token.tokenType === 'tempo') {
    const baseBpm = section?.baseBpm || section?.bpm || token.bpm || 60;
    const currentBpm = getEffectiveBpm(baseBpm, speedFactor);
    return {
      title: formatTempoMarking(currentBpm),
      summary: `当前这段练习按每分钟 ${currentBpm} 拍来理解。速度越慢，你越有时间看清楚下一个音。`,
      bullets: [
        '五线谱里的速度记号和节拍器速度应该对得上。',
        '如果你切到更慢的速度，这里的速度数字也会跟着变化。',
      ],
      topicId: 'tempo',
      actionLabel: '深入了解速度',
    };
  }

  if (token.tokenType === 'rest') {
    const baseBpm = section?.baseBpm || section?.bpm || 60;
    const leadIn = section?.measures ? getLeadingRestInfo(section.measures, baseBpm, speedFactor) : null;
    return {
      title: token.isLeadingRest ? '起始休止' : (REST_LABELS[token.duration] || '休止符'),
      summary: token.isLeadingRest
        ? `这段谱子开头先安静数 ${leadIn?.beats || token.beats} 拍，再进入第一个真正发声的音。`
        : '这个休止符表示这里先不要发声，但心里仍然要继续数拍。',
      bullets: [
        `它在当前谱子里占 ${token.beats} 拍。`,
        token.isLeadingRest
          ? '如果点了播放后暂时没声音，先跟着高亮和节拍器数拍，不是坏了。'
          : '休止不是空白，它是在提醒你“先等、不要抢拍”。',
      ],
      topicId: 'rests',
      actionLabel: '深入了解休止',
    };
  }

  const noteLabel = getDurationLabel(token.duration);
  return {
    title: `${token.pitch} · ${noteLabel}`,
    summary: `这是一个 ${noteLabel}，在高音谱号里读作 ${token.pitchName} 音，位置在 ${token.staffPositionLabel}。`,
    bullets: [
      `它在当前练习里要占 ${token.beats} 拍。`,
      '看到它被高亮时，就把注意力放到这个音和这一拍上。',
    ],
    topicId: 'note-reading',
    actionLabel: '深入了解音符',
  };
}
