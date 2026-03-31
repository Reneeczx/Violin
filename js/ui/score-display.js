import {
  createScoreDisplay,
  createElement,
} from './components.js';
import { createStaffScoreDisplay } from './staff-display.js';
import {
  buildNotationExplainer,
  describeTimeSignature,
  formatTempoMarking,
  getEffectiveBpm,
  getLeadingRestBreakdown,
  getLeadingRestInfo,
} from '../music-theory.js';

export function renderPieceScore(card, section, { getNotationMode, setNotationMode } = {}) {
  const beatsPerMeasure = section.timeSignature?.[0] || 4;

  const guideCard = createElement('div', 'card', '');
  guideCard.style.margin = 'var(--space-md) 0';
  guideCard.style.background = 'var(--color-bg)';
  guideCard.style.borderStyle = 'dashed';
  card.appendChild(guideCard);

  const notationCard = createElement('div', 'notation-card', '');
  notationCard.style.margin = 'var(--space-md) 0';
  card.appendChild(notationCard);

  const toggleRow = createElement('div', 'notation-toggle', '');
  notationCard.appendChild(toggleRow);

  const beginnerPane = createElement('div', 'notation-surface', '');
  const beginnerScore = createScoreDisplay(section.measures, {
    beatsPerMeasure,
    showBeatNumbers: true,
  });
  beginnerScore.id = `score-${section.id}`;
  beginnerPane.appendChild(beginnerScore);
  notationCard.appendChild(beginnerPane);

  const staffPane = createElement('div', 'notation-surface', '');
  notationCard.appendChild(staffPane);

  const explainerCard = createElement('div', 'staff-score-explainer', '');
  notationCard.appendChild(explainerCard);

  const statusTip = createElement('div', 'tip', '');
  statusTip.style.marginBottom = 'var(--space-sm)';
  card.appendChild(statusTip);

  const handles = {
    guideCard,
    statusTip,
    beginnerPane,
    staffPane,
    explainerCard,
    activeTokenId: null,
    activeMode: getNotationMode?.(section.id) || 'beginner',
    getMode() {
      return this.activeMode;
    },
    refreshNotation(speed) {
      renderStaffPane(section, speed, this);
      syncNotationMode(section, this, setNotationMode);
    },
  };

  const beginnerButton = createModeButton('初学者谱', 'beginner', section, handles, setNotationMode);
  const staffButton = createModeButton('五线谱', 'staff', section, handles, setNotationMode);
  toggleRow.appendChild(beginnerButton);
  toggleRow.appendChild(staffButton);
  handles.modeButtons = { beginner: beginnerButton, staff: staffButton };

  handles.refreshNotation(section.recommendedSpeedFactor || section.bpmFactor || 1);
  return handles;
}

export function syncPieceGuide(card, section, speed, handles) {
  updatePieceStatus(handles.statusTip, section, speed);
  updatePieceGuide(handles.guideCard, section, speed);
  handles.refreshNotation(speed);
}

export function setActiveScoreNote(sectionId, noteIndex, activeMeasureIndexes) {
  const beginnerScore = document.getElementById(`score-${sectionId}`);
  if (beginnerScore) {
    beginnerScore.querySelectorAll('.score__note').forEach((noteEl) => {
      const currentNoteIndex = Number(noteEl.dataset.noteIndex);
      const isActive = currentNoteIndex === noteIndex;
      noteEl.classList.toggle('score__note--active', isActive);
      noteEl.classList.toggle('score__note--played', currentNoteIndex < noteIndex);

      if (isActive) {
        setActiveMeasure(sectionId, Number(noteEl.dataset.measureIndex), activeMeasureIndexes);
      }
    });
  }

  const staffScore = document.getElementById(`staff-score-${sectionId}`);
  if (staffScore) {
    staffScore.querySelectorAll('[data-note-index]').forEach((tokenEl) => {
      const currentNoteIndex = Number(tokenEl.dataset.noteIndex);
      const isActive = currentNoteIndex === noteIndex;
      tokenEl.classList.toggle('staff-score__token--active', isActive);
      tokenEl.classList.toggle('staff-score__token--played', currentNoteIndex < noteIndex);

      if (isActive) {
        setActiveMeasure(sectionId, Number(tokenEl.dataset.measureIndex), activeMeasureIndexes);
      }
    });
  }
}

export function resetScoreState(sectionId = null, activeMeasureIndexes = null) {
  const beginnerRoot = sectionId ? document.getElementById(`score-${sectionId}`) : document;
  beginnerRoot?.querySelectorAll?.('.score__note').forEach((noteEl) => {
    noteEl.classList.remove('score__note--active', 'score__note--played');
  });
  beginnerRoot?.querySelectorAll?.('.score__beat').forEach((beatEl) => {
    beatEl.classList.remove('score__beat--active');
  });
  beginnerRoot?.querySelectorAll?.('.score__measure').forEach((measureEl) => {
    measureEl.classList.remove('score__measure--active');
  });

  const staffRoot = sectionId ? document.getElementById(`staff-score-${sectionId}`) : document;
  staffRoot?.querySelectorAll?.('.staff-score__token').forEach((tokenEl) => {
    tokenEl.classList.remove('staff-score__token--active', 'staff-score__token--played');
  });
  staffRoot?.querySelectorAll?.('.staff-score__beat-dot').forEach((dotEl) => {
    dotEl.classList.remove('staff-score__beat-dot--active');
  });
  staffRoot?.querySelectorAll?.('.staff-score__measure-box').forEach((measureEl) => {
    measureEl.classList.remove('staff-score__measure-box--active');
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
  const beginnerScore = document.getElementById(`score-${sectionId}`);
  beginnerScore?.querySelectorAll('.score__beat').forEach((beatEl) => {
    const isActive = Number(beatEl.dataset.measureIndex) === measureIndex
      && Number(beatEl.dataset.beatNumber) === beatNumber;
    beatEl.classList.toggle('score__beat--active', isActive);
  });

  const staffScore = document.getElementById(`staff-score-${sectionId}`);
  staffScore?.querySelectorAll('.staff-score__beat-dot').forEach((dotEl) => {
    const isActive = Number(dotEl.dataset.measureIndex) === measureIndex
      && Number(dotEl.dataset.beatNumber) === beatNumber;
    dotEl.classList.toggle('staff-score__beat-dot--active', isActive);
  });

  setActiveMeasure(sectionId, measureIndex, activeMeasureIndexes);
}

function renderStaffPane(section, speed, handles) {
  handles.staffPane.innerHTML = '';

  const { root, model } = createStaffScoreDisplay(section, {
    speedFactor: speed,
    activeTokenId: handles.activeTokenId,
    onExplain(token) {
      handles.activeTokenId = token.id;
      markSelectedToken(section.id, token.id);
      renderExplainer(section, speed, handles, token);
    },
  });

  root.id = `staff-score-${section.id}`;
  handles.staffModel = model;
  handles.staffPane.appendChild(root);

  if (handles.activeTokenId && model.tokensById[handles.activeTokenId]) {
    renderExplainer(section, speed, handles, model.tokensById[handles.activeTokenId]);
    return;
  }

  renderDefaultExplainer(handles.explainerCard);
}

function createModeButton(label, mode, section, handles, setNotationMode) {
  const button = createElement('button', 'notation-toggle__button', label);
  button.type = 'button';
  button.addEventListener('click', () => {
    handles.activeMode = mode;
    setNotationMode?.(section.id, mode);
    syncNotationMode(section, handles, setNotationMode);
  });
  return button;
}

function syncNotationMode(section, handles) {
  const isStaff = handles.activeMode === 'staff';
  handles.modeButtons.beginner.classList.toggle('notation-toggle__button--active', !isStaff);
  handles.modeButtons.staff.classList.toggle('notation-toggle__button--active', isStaff);
  handles.beginnerPane.classList.toggle('notation-surface--hidden', isStaff);
  handles.staffPane.classList.toggle('notation-surface--hidden', !isStaff);
  handles.explainerCard.classList.toggle('staff-score-explainer--hidden', !isStaff);

  if (isStaff && !handles.activeTokenId) {
    renderDefaultExplainer(handles.explainerCard);
  }
}

function renderExplainer(section, speed, handles, token) {
  const explainer = buildNotationExplainer(token, section, speed);
  if (!explainer) {
    renderDefaultExplainer(handles.explainerCard);
    return;
  }

  handles.explainerCard.innerHTML = `
    <div class="staff-score-explainer__eyebrow">谱内解释</div>
    <div class="staff-score-explainer__title">${escapeHtml(explainer.title)}</div>
    <div class="staff-score-explainer__summary">${escapeHtml(explainer.summary)}</div>
    <div class="staff-score-explainer__bullets">
      ${explainer.bullets.map((bullet) => `<div class="staff-score-explainer__bullet">${escapeHtml(bullet)}</div>`).join('')}
    </div>
  `;

  const actionButton = createElement('button', 'btn btn--secondary', explainer.actionLabel || '深入了解');
  actionButton.style.marginTop = 'var(--space-sm)';
  actionButton.addEventListener('click', () => {
    location.hash = `#/theory/${explainer.topicId}`;
  });
  handles.explainerCard.appendChild(actionButton);
}

function renderDefaultExplainer(container) {
  container.innerHTML = `
    <div class="staff-score-explainer__eyebrow">谱内解释</div>
    <div class="staff-score-explainer__title">点击五线谱里的符号</div>
    <div class="staff-score-explainer__summary">
      切到五线谱后，可以点音符、休止符、拍号、速度记号或高音谱号，直接看这段谱里它们是什么意思。
    </div>
  `;
}

function markSelectedToken(sectionId, tokenId) {
  const staffScore = document.getElementById(`staff-score-${sectionId}`);
  if (!staffScore) {
    return;
  }

  staffScore.querySelectorAll('.staff-score__token').forEach((tokenEl) => {
    tokenEl.classList.toggle('staff-score__token--selected', tokenEl.dataset.notationToken === tokenId);
  });
}

function updatePieceStatus(statusTip, section, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const leadIn = getLeadingRestInfo(section.measures, section.baseBpm, speed);
  const detail = leadIn
    ? `开头有 ${leadIn.beats} 拍休止，大约 ${leadIn.seconds} 秒后才会听到第一个音。先跟着高亮数拍。`
    : '点播放后会立刻进入第一个音。';

  statusTip.innerHTML = `
    <span class="tip__icon">🎼</span>
    <span>当前速度是 ${formatTempoMarking(currentBpm)}，表示四分音符每分钟 ${currentBpm} 拍。${detail}</span>
  `;
}

function updatePieceGuide(guideCard, section, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const timeSignatureText = describeTimeSignature(section.timeSignature || [4, 4]);
  const leadIn = getLeadingRestBreakdown(section.measures, section.baseBpm, speed);
  const leadInText = leadIn
    ? `${leadIn.breakdownText} = ${leadIn.beats} 拍，大约 ${leadIn.seconds} 秒后进入第一个音。`
    : '点播放后会立刻进入第一个音。';

  guideCard.innerHTML = `
    <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin-bottom: var(--space-sm);">
      👀 先这样看这段谱
    </div>
    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.7;">
      <div>1. ${timeSignatureText}</div>
      <div>2. 初学者谱会直接显示拍子和音名；五线谱模式会保留原始位置关系，方便你开始认谱。</div>
      <div>3. 这里的 ${formatTempoMarking(currentBpm)} 表示四分音符每分钟 ${currentBpm} 拍。</div>
      <div>4. 开头休止：${leadInText}</div>
    </div>
  `;
}

function setActiveMeasure(sectionId, measureIndex, activeMeasureIndexes) {
  if (Number.isNaN(measureIndex)) {
    return;
  }

  const beginnerScore = document.getElementById(`score-${sectionId}`);
  beginnerScore?.querySelectorAll('.score__measure').forEach((measureEl) => {
    const isActive = Number(measureEl.dataset.measureIndex) === measureIndex;
    measureEl.classList.toggle('score__measure--active', isActive);
  });

  const staffScore = document.getElementById(`staff-score-${sectionId}`);
  staffScore?.querySelectorAll('.staff-score__measure-box').forEach((measureEl) => {
    const isActive = Number(measureEl.dataset.measureIndex) === measureIndex;
    measureEl.classList.toggle('staff-score__measure-box--active', isActive);
  });

  if (activeMeasureIndexes?.[sectionId] === measureIndex) {
    return;
  }

  if (activeMeasureIndexes) {
    activeMeasureIndexes[sectionId] = measureIndex;
  }

  const activeBeginnerMeasure = beginnerScore?.querySelector(`.score__measure[data-measure-index="${measureIndex}"]`);
  const activeStaffMeasure = staffScore?.querySelector(`.staff-score__measure-box[data-measure-index="${measureIndex}"]`);

  activeBeginnerMeasure?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
  activeStaffMeasure?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
