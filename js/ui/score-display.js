import {
  createScoreDisplay,
  createElement,
} from './components.js';
import {
  describeTimeSignature,
  formatTempoMarking,
  getEffectiveBpm,
  getLeadingRestBreakdown,
  getLeadingRestInfo,
} from '../music-theory.js';

export function renderPieceScore(card, section) {
  const beatsPerMeasure = section.timeSignature?.[0] || 4;

  const guideCard = createElement('div', 'card', '');
  guideCard.style.margin = 'var(--space-md) 0';
  guideCard.style.background = 'var(--color-bg)';
  guideCard.style.borderStyle = 'dashed';
  card.appendChild(guideCard);

  const scoreContainer = createElement('div', '', '');
  scoreContainer.style.margin = 'var(--space-md) 0';

  const scoreEl = createScoreDisplay(section.measures, {
    beatsPerMeasure,
    showBeatNumbers: true,
  });
  scoreEl.id = `score-${section.id}`;
  scoreContainer.appendChild(scoreEl);
  card.appendChild(scoreContainer);

  const statusTip = createElement('div', 'tip', '');
  statusTip.style.marginBottom = 'var(--space-sm)';
  card.appendChild(statusTip);

  return { guideCard, statusTip };
}

export function syncPieceGuide(card, section, speed, { guideCard, statusTip }) {
  updatePieceStatus(statusTip, section, speed);
  updatePieceGuide(guideCard, section, speed);
}

export function setActiveScoreNote(sectionId, noteIndex, activeMeasureIndexes) {
  const scoreEl = document.getElementById(`score-${sectionId}`);
  if (!scoreEl) {
    return;
  }

  scoreEl.querySelectorAll('.score__note').forEach((noteEl) => {
    const currentNoteIndex = Number(noteEl.dataset.noteIndex);
    const isActive = currentNoteIndex === noteIndex;
    noteEl.classList.toggle('score__note--active', isActive);
    noteEl.classList.toggle('score__note--played', currentNoteIndex < noteIndex);

    if (isActive) {
      setActiveMeasure(sectionId, Number(noteEl.dataset.measureIndex), activeMeasureIndexes);
    }
  });
}

export function resetScoreState(sectionId = null, activeMeasureIndexes = null) {
  const root = sectionId ? document.getElementById(`score-${sectionId}`) : document;
  if (!root) {
    return;
  }

  root.querySelectorAll?.('.score__note').forEach((noteEl) => {
    noteEl.classList.remove('score__note--active', 'score__note--played');
  });
  root.querySelectorAll?.('.score__beat').forEach((beatEl) => {
    beatEl.classList.remove('score__beat--active');
  });
  root.querySelectorAll?.('.score__measure').forEach((measureEl) => {
    measureEl.classList.remove('score__measure--active');
  });

  if (!activeMeasureIndexes) {
    return;
  }

  if (sectionId) {
    delete activeMeasureIndexes[sectionId];
    return;
  }

  Object.keys(activeMeasureIndexes).forEach((key) => {
    delete activeMeasureIndexes[key];
  });
}

export function setActiveBeat(sectionId, measureIndex, beatNumber, activeMeasureIndexes) {
  const scoreEl = document.getElementById(`score-${sectionId}`);
  if (!scoreEl) {
    return;
  }

  scoreEl.querySelectorAll('.score__beat').forEach((beatEl) => {
    const isActive = Number(beatEl.dataset.measureIndex) === measureIndex
      && Number(beatEl.dataset.beatNumber) === beatNumber;
    beatEl.classList.toggle('score__beat--active', isActive);
  });

  setActiveMeasure(sectionId, measureIndex, activeMeasureIndexes);
}

function updatePieceStatus(statusTip, section, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const leadIn = getLeadingRestInfo(section.measures, section.baseBpm, speed);
  const detail = leadIn
    ? `开头有 ${leadIn.beats} 拍休止，大约 ${leadIn.seconds} 秒后才会听到第一声音。先跟着高亮数拍。`
    : '点播放后会立刻进入第一声音。';

  statusTip.innerHTML = `
    <span class="tip__icon">🎖</span>
    <span>当前速度是 ${formatTempoMarking(currentBpm)}，表示四分音符每分钟 ${currentBpm} 拍。${detail}</span>
  `;
}

function updatePieceGuide(guideCard, section, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const timeSignatureText = describeTimeSignature(section.timeSignature || [4, 4]);
  const leadIn = getLeadingRestBreakdown(section.measures, section.baseBpm, speed);
  const leadInText = leadIn
    ? `${leadIn.breakdownText} = ${leadIn.beats}拍，大约 ${leadIn.seconds} 秒后进入第一声音。`
    : '点播放后会立刻进入第一声音。';

  guideCard.innerHTML = `
    <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin-bottom: var(--space-sm);">
      👖 先这样看这段谱
    </div>
    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.7;">
      <div>1. ${timeSignatureText}</div>
      <div>2. 谱上方的 1 2 3 4 就是每一拍的编号；高亮往前走一格，就是前进 1 拍。</div>
      <div>3. 这里的 ${formatTempoMarking(currentBpm)} 表示四分音符每分钟 ${currentBpm} 拍。</div>
      <div>4. 开头休止：${leadInText}</div>
    </div>
  `;
}

function setActiveMeasure(sectionId, measureIndex, activeMeasureIndexes) {
  const scoreEl = document.getElementById(`score-${sectionId}`);
  if (!scoreEl || Number.isNaN(measureIndex)) {
    return;
  }

  scoreEl.querySelectorAll('.score__measure').forEach((measureEl) => {
    const isActive = Number(measureEl.dataset.measureIndex) === measureIndex;
    measureEl.classList.toggle('score__measure--active', isActive);
  });

  if (activeMeasureIndexes?.[sectionId] === measureIndex) {
    return;
  }

  if (activeMeasureIndexes) {
    activeMeasureIndexes[sectionId] = measureIndex;
  }

  const activeMeasureEl = scoreEl.querySelector(`.score__measure[data-measure-index="${measureIndex}"]`);
  activeMeasureEl?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
}
