import { generateDailyPlan, getDayNumber, getPracticeDateStr } from '../practice-plan.js';
import {
  createCard,
  createCheckbox,
  createTip,
  createElement,
  formatTime,
} from './components.js';
import Tracking from '../tracking.js';
import Timer from '../timer.js';
import EventBus from '../event-bus.js';
import audioEngine from '../audio-engine.js';
import practicePlayer from '../practice-player.js';
import {
  getSilentModeHintText,
  shouldShowSilentModeHint,
} from '../audio-support.js';
import { formatTempoMarking } from '../music-theory.js';
import {
  renderPieceScore,
  syncPieceGuide,
  setActiveScoreNote,
  resetScoreState,
  setActiveBeat,
} from './score-display.js';
import {
  renderPiecePlaybackControls,
  renderStringsPlaybackControls,
  syncPiecePlaybackUi,
  syncStringsPlaybackUi,
  syncPieceTempoDisplay,
  clearReferenceButtons,
} from './playback-controls.js';
import { renderRecordingSection } from './recording-ui.js';

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
  clearReferenceButtons();
  resetScoreState(null, _activeMeasureIndexes);
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

  if (shouldShowSilentModeHint()) {
    const audioHint = createTip(getSilentModeHintText(), '🔇');
    audioHint.style.marginTop = 'var(--space-md)';
    _container.appendChild(audioHint);
  }

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
    _container.appendChild(renderSection(section, isCompleted));
  });

  renderCompleteButton();
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

  renderRecordingSection(card, section, getSessionContext());
  card.appendChild(createCompletionRow(card, section, isCompleted));

  return card;
}

function renderPieceSection(card, section) {
  ensureSectionSpeed(section);

  const scoreHandles = renderPieceScore(card, section);
  const { bpmEl } = renderPiecePlaybackControls(card, section, {
    getSpeed: getSectionSpeed,
    setSpeed: setSectionSpeed,
    onSpeedChange: () => {
      if (practicePlayer.isSectionActive(section.id)) {
        practicePlayer.stop();
      }
      syncPieceSectionTempo(card, section, bpmEl, scoreHandles);
      syncAllPlaybackUi();
    },
    ensureAudioContext: () => audioEngine.ensureContext(),
    startDemo: async (targetSection, speed) => {
      if (practicePlayer.isDemoPlaying(targetSection.id)) {
        practicePlayer.stop();
        return practicePlayer.state;
      }

      return practicePlayer.startDemo({
        sectionId: targetSection.id,
        measures: targetSection.measures,
        bpm: targetSection.baseBpm,
        speedFactor: speed,
        beatsPerMeasure: targetSection.timeSignature?.[0] || 4,
      });
    },
    toggleClick: (targetSection, speed) => practicePlayer.toggleClick({
      sectionId: targetSection.id,
      bpm: targetSection.baseBpm,
      speedFactor: speed,
      beatsPerMeasure: targetSection.timeSignature?.[0] || 4,
    }),
    toggleReference: async () => practicePlayer.state,
  });

  syncPieceSectionTempo(card, section, bpmEl, scoreHandles);
}

function renderStringsSection(card, section) {
  renderStringsPlaybackControls(card, section, {
    ensureAudioContext: () => audioEngine.ensureContext(),
    getSpeed: () => 1,
    setSpeed: () => {},
    onSpeedChange: () => {},
    startDemo: async () => practicePlayer.state,
    toggleClick: (targetSection) => practicePlayer.toggleClick({
      sectionId: targetSection.id,
      bpm: targetSection.bpm,
      beatsPerMeasure: 4,
    }),
    toggleReference: async (sectionId, pitch) => {
      if (practicePlayer.isReferencePlaying(sectionId, pitch)) {
        practicePlayer.stop();
        return practicePlayer.state;
      }

      return practicePlayer.startReference({
        sectionId,
        pitch,
      });
    },
  });
}

function createTheoryButton(section) {
  if (section.type === 'warmup' || section.type === 'cooldown') {
    return null;
  }

  const topicId = section.measures ? 'tempo' : 'open-strings';
  const label = section.measures
    ? '📌 看懂 ♩=48 / pizz.'
    : '📌 看懂空弦和音名';
  const theoryBtn = createElement('button', 'btn btn--ghost', label);
  theoryBtn.style.marginTop = 'var(--space-sm)';
  theoryBtn.style.alignSelf = 'flex-start';
  theoryBtn.addEventListener('click', () => {
    location.hash = `#/theory/${topicId}`;
  });
  return theoryBtn;
}

function createCompletionRow(card, section, isCompleted) {
  const checkboxContainer = createElement('div', '', '');
  checkboxContainer.style.marginTop = 'var(--space-md)';
  checkboxContainer.style.borderTop = '1px solid var(--color-border)';
  checkboxContainer.style.paddingTop = 'var(--space-md)';

  const checkbox = createCheckbox('完成此项', isCompleted, (checked) => {
    Tracking.toggleSection(_lesson.weekOf, _dayNumber, section.id);
    card.classList.toggle('card--completed', checked);
  });
  checkboxContainer.appendChild(checkbox);

  return checkboxContainer;
}

function renderCompleteButton() {
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
    return;
  }

  const doneMsg = createElement('div', 'tip', `
    <span class="tip__icon">✅</span>
    <span>今天的练习已经完成，明天继续。</span>
  `);
  doneMsg.style.marginTop = 'var(--space-lg)';
  _container.appendChild(doneMsg);
}

function syncPieceSectionTempo(card, section, bpmEl, scoreHandles) {
  const speed = getSectionSpeed(section.id);
  syncPieceTempoDisplay(card, section, bpmEl, speed);
  syncPieceGuide(card, section, speed, scoreHandles);
}

function ensureSectionSpeed(section) {
  if (_currentSpeedFactors[section.id] == null) {
    _currentSpeedFactors[section.id] = section.recommendedSpeedFactor || section.bpmFactor || 1;
  }
}

function getSectionSpeed(sectionId) {
  return _currentSpeedFactors[sectionId] || 1;
}

function setSectionSpeed(sectionId, speed) {
  _currentSpeedFactors[sectionId] = speed;
}

function getSessionContext() {
  return {
    dayNumber: _dayNumber,
    weekOf: _lesson.weekOf,
  };
}

function syncAllPlaybackUi() {
  if (!_plan) {
    return;
  }

  const playerState = practicePlayer.state;
  _plan.sections.forEach((section) => {
    if (section.measures) {
      syncPiecePlaybackUi(section, playerState);
      return;
    }

    if (section.strings) {
      syncStringsPlaybackUi(section, playerState);
    }
  });
}

function updateMetronomeVisual(sectionId, beat, isAccent) {
  const visual = document.getElementById(`met-visual-${sectionId}`);
  if (!visual || visual.style.display === 'none') {
    return;
  }

  visual.querySelectorAll('.metronome-beat').forEach((dot, index) => {
    dot.classList.remove('metronome-beat--active', 'metronome-beat--accent');
    if (index === beat) {
      dot.classList.add(isAccent ? 'metronome-beat--accent' : 'metronome-beat--active');
    }
  });
}

function onTimerTick(elapsed) {
  if (_timerEl) {
    _timerEl.textContent = formatTime(elapsed);
  }
}

function onPracticeBeat({ sectionId, beat, beatNumber, measureIndex, isAccent }) {
  updateMetronomeVisual(sectionId, beat, isAccent);
  setActiveBeat(sectionId, measureIndex, beatNumber, _activeMeasureIndexes);
}

function onPracticeNoteChange({ sectionId, noteIndex }) {
  setActiveScoreNote(sectionId, noteIndex, _activeMeasureIndexes);
}

function onPracticeStateChange() {
  syncAllPlaybackUi();

  if (practicePlayer.state.mode !== 'demo') {
    resetScoreState(null, _activeMeasureIndexes);
  }
}
