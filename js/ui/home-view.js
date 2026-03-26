import { generateDailyPlan, getDayNumber, getPracticeDateStr } from '../practice-plan.js';
import {
  createCard,
  createCheckbox,
  createTip,
  createSpeedGroup,
  createScoreDisplay,
  createElement,
  formatTime,
} from './components.js';
import Tracking from '../tracking.js';
import Timer from '../timer.js';
import EventBus from '../event-bus.js';
import practicePlayer from '../practice-player.js';
import Recorder from '../recorder.js';
import {
  buildSpeedOptions,
  describeTimeSignature,
  formatTempoMarking,
  getEffectiveBpm,
  getLeadingRestBreakdown,
  getLeadingRestInfo,
} from '../music-theory.js';

let _container = null;
let _plan = null;
let _lesson = null;
let _dayNumber = 0;
let _timerEl = null;
let _currentSpeedFactors = {};
let _activeMeasureIndexes = {};

export function init(container) {
  _container = container;
}

export function show() {
  _lesson = window.CURRENT_LESSON;
  _currentSpeedFactors = {};
  _activeMeasureIndexes = {};

  if (!_lesson) {
    _container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🎻</div>
        <div class="empty-state__text">还没有课程数据</div>
      </div>
    `;
    return;
  }

  _dayNumber = getDayNumber(_lesson.lessonDay);
  _plan = generateDailyPlan(_lesson, _dayNumber);
  render();

  EventBus.on('timer:tick', onTimerTick);
  EventBus.on('practice:beat', onPracticeBeat);
  EventBus.on('practice:notechange', onPracticeNoteChange);
  EventBus.on('practice:statechange', onPracticeStateChange);

  syncAllPlaybackUi();
}

export function hide() {
  EventBus.off('timer:tick', onTimerTick);
  EventBus.off('practice:beat', onPracticeBeat);
  EventBus.off('practice:notechange', onPracticeNoteChange);
  EventBus.off('practice:statechange', onPracticeStateChange);
  practicePlayer.stop();
  clearAllReferenceButtonStates();
  resetScoreState();
  _activeMeasureIndexes = {};
}

function render() {
  _container.innerHTML = '';

  const completedDays = Tracking.getCompletedDays(_lesson.weekOf);
  const dateStr = getPracticeDateStr(_lesson.lessonDay, _lesson.weekOf, _dayNumber);

  const header = createElement('div', '', `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
        ${_lesson.title} · 第 ${_dayNumber} 天
      </div>
      <div style="font-size: var(--font-size-md); margin-top: var(--space-xs);">
        ${dateStr}
      </div>
      <div id="progress-dots" style="margin-top: var(--space-md);"></div>
    </div>
  `);
  _container.appendChild(header);

  const dotsContainer = header.querySelector('#progress-dots');
  for (let i = 1; i <= 7; i += 1) {
    const dot = createElement('span', 'progress-dot');
    if (completedDays.includes(i)) dot.classList.add('progress-dot--done');
    if (i === _dayNumber) dot.classList.add('progress-dot--current');
    dot.style.display = 'inline-block';
    dot.style.margin = '0 4px';
    dotsContainer.appendChild(dot);
  }

  const timerCard = createCard({
    title: _plan.theme,
    subtitle: `预计 ${_plan.totalMinutes} 分钟`,
    content: `
      <div style="text-align:center; margin: var(--space-md) 0;">
        <div class="timer" id="session-timer">0:00</div>
        <div class="controls controls--center" style="margin-top: var(--space-md);">
          <button class="btn btn--primary btn--large" id="timer-toggle-btn">开始练习</button>
        </div>
      </div>
    `,
  });
  _container.appendChild(timerCard);

  _timerEl = timerCard.querySelector('#session-timer');
  const timerBtn = timerCard.querySelector('#timer-toggle-btn');
  timerBtn.addEventListener('click', () => {
    Timer.toggle();
    timerBtn.textContent = Timer.running ? '暂停' : '继续练习';
    timerBtn.classList.toggle('btn--primary', !Timer.running);
    timerBtn.classList.toggle('btn--secondary', Timer.running);
  });

  if (Timer.elapsed > 0) {
    _timerEl.textContent = formatTime(Timer.elapsed);
    timerBtn.textContent = Timer.running ? '暂停' : '继续练习';
    timerBtn.classList.toggle('btn--primary', !Timer.running);
    timerBtn.classList.toggle('btn--secondary', Timer.running);
  }

  if (_lesson.teacherNotes) {
    _container.appendChild(createTip(_lesson.teacherNotes, '👩‍🏫'));
  }

  _plan.sections.forEach((section) => {
    const isCompleted = Tracking.isSectionCompleted(_lesson.weekOf, _dayNumber, section.id);
    const card = renderSection(section, isCompleted);
    _container.appendChild(card);
  });

  const allSectionIds = _plan.sections.map((section) => section.id);
  const allDone = Tracking.isDayCompleted(_lesson.weekOf, _dayNumber, allSectionIds);

  if (!allDone) {
    const completeBtn = createElement('button', 'btn btn--primary btn--large btn--full', '完成今日练习 ⭐');
    completeBtn.style.marginTop = 'var(--space-lg)';
    completeBtn.addEventListener('click', () => {
      allSectionIds.forEach((sectionId) => {
        if (!Tracking.isSectionCompleted(_lesson.weekOf, _dayNumber, sectionId)) {
          Tracking.toggleSection(_lesson.weekOf, _dayNumber, sectionId);
        }
      });

      Tracking.markDayPracticed(_lesson.weekOf, _dayNumber, Timer.elapsed);
      Timer.reset();
      practicePlayer.stop();
      render();
    });
    _container.appendChild(completeBtn);
  } else {
    const doneMsg = createElement('div', 'tip', `
      <span class="tip__icon">✅</span>
      <span>今天的练习已经完成，明天继续。</span>
    `);
    doneMsg.style.marginTop = 'var(--space-lg)';
    _container.appendChild(doneMsg);
  }

  syncAllPlaybackUi();
}

function renderSection(section, isCompleted) {
  const modeLabel = section.mode === 'pizzicato'
    ? '拨弦 (pizz.)'
    : section.mode === 'arco'
      ? '拉弓 (arco)'
      : section.mode === 'both'
        ? '拨弦 + 拉弓'
        : '';

  const badgeText = section.type === 'warmup' || section.type === 'cooldown'
    ? `${section.durationMinutes}分钟`
    : section.recommendedBpm
      ? formatTempoMarking(section.recommendedBpm)
      : `${section.durationMinutes}分钟`;

  const card = createCard({
    title: `${section.icon} ${section.title}`,
    subtitle: modeLabel,
    badge: badgeText,
    completed: isCompleted,
  });
  card.dataset.sectionId = section.id;

  if (section.focus) {
    card.appendChild(createTip(section.focus));
  }

  const theoryButton = createTheoryButton(section);
  if (theoryButton) {
    card.appendChild(theoryButton);
  }

  if (section.measures) {
    renderPieceSection(card, section);
  }

  if (section.strings) {
    renderStringsSection(card, section);
  }

  renderRecordingSection(card, section);

  const checkboxContainer = createElement('div', '', '');
  checkboxContainer.style.marginTop = 'var(--space-md)';
  checkboxContainer.style.borderTop = '1px solid var(--color-border)';
  checkboxContainer.style.paddingTop = 'var(--space-md)';

  const checkbox = createCheckbox('完成此项', isCompleted, (checked) => {
    Tracking.toggleSection(_lesson.weekOf, _dayNumber, section.id);
    card.classList.toggle('card--completed', checked);
  });
  checkboxContainer.appendChild(checkbox);
  card.appendChild(checkboxContainer);

  return card;
}

function renderPieceSection(card, section) {
  if (_currentSpeedFactors[section.id] == null) {
    _currentSpeedFactors[section.id] = section.recommendedSpeedFactor || section.bpmFactor || 1;
  }

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

  const controls = createElement('div', 'controls', '');
  controls.style.marginTop = 'var(--space-sm)';
  controls.style.alignItems = 'center';

  const speedGroup = createSpeedGroup(
    buildSpeedOptions(section.recommendedSpeedFactor || section.bpmFactor || 1),
    _currentSpeedFactors[section.id],
    (speed) => {
      if (practicePlayer.isSectionActive(section.id)) {
        practicePlayer.stop();
      }
      _currentSpeedFactors[section.id] = speed;
      syncPieceTempoDisplay(card, section, controls, statusTip, guideCard, speed);
      syncAllPlaybackUi();
    },
  );
  controls.appendChild(speedGroup);

  const bpmEl = createElement('span', 'bpm-display', '');
  controls.appendChild(bpmEl);
  card.appendChild(controls);

  syncPieceTempoDisplay(card, section, controls, statusTip, guideCard, _currentSpeedFactors[section.id]);

  const metVisual = createElement('div', 'metronome-visual');
  metVisual.id = `met-visual-${section.id}`;
  metVisual.style.margin = 'var(--space-sm) 0';
  metVisual.style.display = 'none';
  for (let i = 0; i < beatsPerMeasure; i += 1) {
    metVisual.appendChild(createElement('div', 'metronome-beat'));
  }
  card.appendChild(metVisual);

  const btnRow = createElement('div', 'controls', '');
  btnRow.style.marginTop = 'var(--space-sm)';

  const playBtn = createElement('button', 'btn btn--secondary', '▶ 播放示范');
  playBtn.id = `play-btn-${section.id}`;
  playBtn.addEventListener('click', async () => {
    if (practicePlayer.isDemoPlaying(section.id)) {
      practicePlayer.stop();
      return;
    }

    const speed = _currentSpeedFactors[section.id] || 1;
    await practicePlayer.startDemo({
      sectionId: section.id,
      measures: section.measures,
      bpm: section.baseBpm,
      speedFactor: speed,
      beatsPerMeasure,
    });
  });
  btnRow.appendChild(playBtn);

  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.id = `met-btn-${section.id}`;
  metBtn.addEventListener('click', async () => {
    await practicePlayer.toggleClick({
      sectionId: section.id,
      bpm: section.baseBpm,
      speedFactor: _currentSpeedFactors[section.id] || 1,
      beatsPerMeasure,
    });
  });
  btnRow.appendChild(metBtn);

  btnRow.appendChild(createRecordButton(section.id));
  card.appendChild(btnRow);
}

function renderStringsSection(card, section) {
  const stringsEl = createElement('div', 'controls controls--center', '');
  stringsEl.style.margin = 'var(--space-md) 0';
  stringsEl.style.gap = 'var(--space-md)';

  section.strings.forEach((stringData) => {
    const btn = createElement('button', 'btn btn--secondary', '');
    btn.style.flexDirection = 'column';
    btn.style.minWidth = '64px';
    btn.style.borderLeft = `4px solid ${stringData.color}`;
    btn.dataset.referenceSection = section.id;
    btn.dataset.referencePitch = stringData.pitch;
    btn.dataset.referenceColor = stringData.color;
    btn.innerHTML = `
      <strong style="font-size: var(--font-size-xl);">${stringData.name}</strong>
      <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${stringData.solfege}</span>
    `;

    btn.addEventListener('click', async () => {
      if (practicePlayer.isReferencePlaying(section.id, stringData.pitch)) {
        practicePlayer.stop();
        return;
      }

      await practicePlayer.startReference({
        sectionId: section.id,
        pitch: stringData.pitch,
      });
    });

    stringsEl.appendChild(btn);
  });
  card.appendChild(stringsEl);

  const btnRow = createElement('div', 'controls controls--center', '');

  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.id = `met-btn-${section.id}`;
  metBtn.addEventListener('click', async () => {
    await practicePlayer.toggleClick({
      sectionId: section.id,
      bpm: section.bpm,
      beatsPerMeasure: 4,
    });
  });
  btnRow.appendChild(metBtn);

  btnRow.appendChild(createRecordButton(section.id));
  card.appendChild(btnRow);
}

function createTheoryButton(section) {
  if (section.type === 'warmup' || section.type === 'cooldown') {
    return null;
  }

  const topicId = section.measures ? 'tempo' : 'open-strings';
  const label = section.measures
    ? '📘 看懂 ♩=48 / pizz.'
    : '📘 看懂空弦和音名';
  const theoryBtn = createElement('button', 'btn btn--ghost', label);
  theoryBtn.style.marginTop = 'var(--space-sm)';
  theoryBtn.style.alignSelf = 'flex-start';
  theoryBtn.addEventListener('click', () => {
    location.hash = `#/theory/${topicId}`;
  });
  return theoryBtn;
}

function syncPieceTempoDisplay(card, section, controls, statusTip, guideCard, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const badge = card.querySelector('.card__badge');
  const bpmDisplay = controls.querySelector('.bpm-display');

  if (badge) {
    badge.textContent = formatTempoMarking(currentBpm);
  }

  if (bpmDisplay) {
    bpmDisplay.textContent = `当前 ${formatTempoMarking(currentBpm)} · 原速 ${formatTempoMarking(section.originalBpm || section.baseBpm)}`;
  }

  updatePieceStatus(statusTip, section, speed);
  updatePieceGuide(guideCard, section, speed);
}

function updatePieceStatus(statusTip, section, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const leadIn = getLeadingRestInfo(section.measures, section.baseBpm, speed);
  const detail = leadIn
    ? `开头有 ${leadIn.beats} 拍休止，大约 ${leadIn.seconds} 秒后才会听到第一声音。先跟着高亮数拍。`
    : '点播放后会立刻进入第一声音。';

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
    ? `${leadIn.breakdownText} = ${leadIn.beats}拍，大约 ${leadIn.seconds} 秒后进入第一声音。`
    : '点播放后会立刻进入第一声音。';

  guideCard.innerHTML = `
    <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin-bottom: var(--space-sm);">
      👀 先这样看这段谱
    </div>
    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.7;">
      <div>1. ${timeSignatureText}</div>
      <div>2. 谱上方的 1 2 3 4 就是每一拍的编号；高亮往前走一格，就是前进 1 拍。</div>
      <div>3. 这里的 ${formatTempoMarking(currentBpm)} 表示四分音符每分钟 ${currentBpm} 拍。</div>
      <div>4. 开头休止：${leadInText}</div>
    </div>
  `;
}

function setActiveScoreNote(sectionId, noteIndex) {
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
      setActiveMeasure(sectionId, Number(noteEl.dataset.measureIndex));
    }
  });
}

function resetScoreState(sectionId = null) {
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

  if (sectionId) {
    delete _activeMeasureIndexes[sectionId];
  } else {
    _activeMeasureIndexes = {};
  }
}

function setActiveBeat(sectionId, measureIndex, beatNumber) {
  const scoreEl = document.getElementById(`score-${sectionId}`);
  if (!scoreEl) {
    return;
  }

  scoreEl.querySelectorAll('.score__beat').forEach((beatEl) => {
    const isActive = Number(beatEl.dataset.measureIndex) === measureIndex
      && Number(beatEl.dataset.beatNumber) === beatNumber;
    beatEl.classList.toggle('score__beat--active', isActive);
  });

  setActiveMeasure(sectionId, measureIndex);
}

function setActiveMeasure(sectionId, measureIndex) {
  const scoreEl = document.getElementById(`score-${sectionId}`);
  if (!scoreEl || Number.isNaN(measureIndex)) {
    return;
  }

  scoreEl.querySelectorAll('.score__measure').forEach((measureEl) => {
    const isActive = Number(measureEl.dataset.measureIndex) === measureIndex;
    measureEl.classList.toggle('score__measure--active', isActive);
  });

  if (_activeMeasureIndexes[sectionId] === measureIndex) {
    return;
  }
  _activeMeasureIndexes[sectionId] = measureIndex;

  const activeMeasureEl = scoreEl.querySelector(`.score__measure[data-measure-index="${measureIndex}"]`);
  activeMeasureEl?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
}

function clearReferenceButtons(sectionId = null) {
  const selector = sectionId
    ? `[data-reference-section="${sectionId}"]`
    : '[data-reference-section]';
  document.querySelectorAll(selector).forEach((button) => {
    button.style.transform = '';
    button.style.boxShadow = '';
  });
}

function clearAllReferenceButtonStates() {
  clearReferenceButtons();
}

function setReferenceButtonsActive(sectionId, pitch) {
  document.querySelectorAll(`[data-reference-section="${sectionId}"]`).forEach((button) => {
    const isActive = button.dataset.referencePitch === pitch;
    button.style.transform = isActive ? 'scale(1.08)' : '';
    button.style.boxShadow = isActive ? `0 0 0 3px ${button.dataset.referenceColor}40` : '';
  });
}

function syncAllPlaybackUi() {
  if (!_plan) {
    return;
  }

  _plan.sections.forEach((section) => {
    if (section.measures) {
      syncPiecePlaybackUi(section);
      return;
    }

    if (section.strings) {
      syncStringsPlaybackUi(section);
    }
  });
}

function syncPiecePlaybackUi(section) {
  const playBtn = document.getElementById(`play-btn-${section.id}`);
  const metBtn = document.getElementById(`met-btn-${section.id}`);
  const metVisual = document.getElementById(`met-visual-${section.id}`);
  const state = practicePlayer.state;

  const isDemo = state.mode === 'demo' && state.sectionId === section.id;
  const isClickOnly = state.mode === 'click' && state.sectionId === section.id;
  const isAnyDemo = state.mode === 'demo';

  if (playBtn) {
    playBtn.textContent = isDemo ? '⏹ 停止' : '▶ 播放示范';
    playBtn.classList.toggle('btn--primary', isDemo);
    playBtn.classList.toggle('btn--secondary', !isDemo);
  }

  if (metBtn) {
    if (isClickOnly) {
      metBtn.textContent = '⏹ 停止节拍器';
      metBtn.classList.add('btn--recording');
      metBtn.disabled = false;
    } else if (isAnyDemo) {
      metBtn.textContent = '示范播放中';
      metBtn.classList.remove('btn--recording');
      metBtn.disabled = true;
    } else {
      metBtn.textContent = '🔔 节拍器';
      metBtn.classList.remove('btn--recording');
      metBtn.disabled = false;
    }
  }

  if (metVisual) {
    metVisual.style.display = isClickOnly ? 'flex' : 'none';
  }

  if (!isDemo) {
    resetScoreState(section.id);
  }
}

function syncStringsPlaybackUi(section) {
  const metBtn = document.getElementById(`met-btn-${section.id}`);
  const state = practicePlayer.state;
  const isClickOnly = state.mode === 'click' && state.sectionId === section.id;
  const isAnyDemo = state.mode === 'demo';
  const isReference = state.mode === 'reference' && state.sectionId === section.id;

  clearReferenceButtons(section.id);
  if (isReference && state.pitch) {
    setReferenceButtonsActive(section.id, state.pitch);
  }

  if (metBtn) {
    metBtn.textContent = isClickOnly ? '⏹ 停止节拍器' : '🔔 节拍器';
    metBtn.classList.toggle('btn--recording', isClickOnly);

    if (isAnyDemo && !isClickOnly) {
      metBtn.textContent = '示范播放中';
      metBtn.classList.remove('btn--recording');
      metBtn.disabled = true;
    } else {
      metBtn.disabled = false;
    }
  }
}

function createRecordButton(exerciseId) {
  const recBtn = createElement('button', 'btn btn--ghost', '🎤 录音');
  let recording = false;

  recBtn.addEventListener('click', async () => {
    if (!recording) {
      try {
        await Recorder.startRecording(exerciseId, _dayNumber, _lesson.weekOf);
        recording = true;
        recBtn.textContent = '⏹ 停止录音';
        recBtn.classList.add('btn--recording');
      } catch (error) {
        alert('无法访问麦克风，请检查权限设置。');
        console.error('Recording error:', error);
      }
      return;
    }

    const meta = await Recorder.stopRecording();
    recording = false;
    recBtn.textContent = '🎤 录音';
    recBtn.classList.remove('btn--recording');

    if (meta) {
      const listEl = recBtn.closest('.card')?.querySelector('.recording-list');
      if (listEl) {
        refreshRecordingList(listEl, exerciseId);
      }
    }
  });

  return recBtn;
}

function renderRecordingSection(card, section) {
  if (section.type === 'warmup' || section.type === 'cooldown') {
    return;
  }

  const container = createElement('div', '', '');
  container.style.marginTop = 'var(--space-md)';

  const listEl = createElement('div', 'recording-list');
  listEl.dataset.exerciseId = section.id;
  container.appendChild(listEl);

  card.appendChild(container);
  refreshRecordingList(listEl, section.id);
}

async function refreshRecordingList(listEl, exerciseId) {
  const recordings = await Recorder.getRecordings(exerciseId, _dayNumber, _lesson.weekOf);
  if (!recordings || recordings.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = `<div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:var(--space-xs);">🎤 今日录音 (${recordings.length})</div>`;

  recordings.forEach((recording) => {
    const item = createElement('div', 'recording-item');
    const time = new Date(recording.createdAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const durationSec = Math.round((recording.durationMs || 0) / 1000);

    item.innerHTML = `
      <div class="recording-item__info">
        <div class="recording-item__time">${time}</div>
        <div class="recording-item__duration">${durationSec}秒</div>
      </div>
    `;

    const playBtn = createElement('button', 'btn btn--icon btn--ghost', '▶');
    playBtn.addEventListener('click', () => {
      Recorder.playRecording(recording.id);
      playBtn.textContent = '⏹';
      window.setTimeout(() => {
        playBtn.textContent = '▶';
      }, (recording.durationMs || 5000) + 500);
    });
    item.appendChild(playBtn);

    const delBtn = createElement('button', 'btn btn--icon btn--ghost', '🗑');
    delBtn.addEventListener('click', async () => {
      if (confirm('删除这条录音？')) {
        await Recorder.deleteRecording(recording.id);
        refreshRecordingList(listEl, exerciseId);
      }
    });
    item.appendChild(delBtn);

    listEl.appendChild(item);
  });
}

function onTimerTick(elapsed) {
  if (_timerEl) {
    _timerEl.textContent = formatTime(elapsed);
  }
}

function onPracticeBeat({ sectionId, beat, beatNumber, measureIndex, isAccent }) {
  document.querySelectorAll('.metronome-visual').forEach((visual) => {
    const visualSectionId = visual.id.replace('met-visual-', '');
    if (visualSectionId !== sectionId || visual.style.display === 'none') {
      return;
    }

    const dots = visual.querySelectorAll('.metronome-beat');
    dots.forEach((dot, index) => {
      dot.classList.remove('metronome-beat--active', 'metronome-beat--accent');
      if (index === beat) {
        dot.classList.add(isAccent ? 'metronome-beat--accent' : 'metronome-beat--active');
      }
    });
  });

  setActiveBeat(sectionId, measureIndex, beatNumber);
}

function onPracticeNoteChange({ sectionId, noteIndex }) {
  setActiveScoreNote(sectionId, noteIndex);
}

function onPracticeStateChange() {
  syncAllPlaybackUi();

  if (practicePlayer.state.mode !== 'demo') {
    resetScoreState();
  }
}
