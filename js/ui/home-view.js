import { generateDailyPlan, getDayNumber, getPracticeDateStr } from '../practice-plan.js';
import { createCard, createCheckbox, createTip, createSpeedGroup, createScoreDisplay, createElement, formatTime } from './components.js';
import Tracking from '../tracking.js';
import Timer from '../timer.js';
import EventBus from '../event-bus.js';
import audioEngine from '../audio-engine.js';
import metronome from '../metronome.js';
import Recorder from '../recorder.js';

let _container = null;
let _plan = null;
let _lesson = null;
let _dayNumber = 0;
let _timerEl = null;
let _currentSpeedFactors = {}; // track per-section speed

export function init(container) {
  _container = container;
}

export function show() {
  _lesson = window.CURRENT_LESSON;
  if (!_lesson) {
    _container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📭</div><div class="empty-state__text">还没有课程数据</div></div>';
    return;
  }

  _dayNumber = getDayNumber(_lesson.lessonDay);
  _plan = generateDailyPlan(_lesson, _dayNumber);
  render();

  EventBus.on('timer:tick', onTimerTick);
  EventBus.on('metronome:beat', onMetronomeBeat);
}

export function hide() {
  EventBus.off('timer:tick', onTimerTick);
  EventBus.off('metronome:beat', onMetronomeBeat);
  audioEngine.stop();
  metronome.stop();
}

function render() {
  _container.innerHTML = '';

  // Day header
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

  // Progress dots
  const dotsContainer = header.querySelector('#progress-dots');
  for (let i = 1; i <= 7; i++) {
    const dot = createElement('span', 'progress-dot');
    if (completedDays.includes(i)) dot.classList.add('progress-dot--done');
    if (i === _dayNumber) dot.classList.add('progress-dot--current');
    dot.style.display = 'inline-block';
    dot.style.margin = '0 4px';
    dotsContainer.appendChild(dot);
  }

  // Theme & timer card
  const timerCard = createCard({
    title: `${_plan.theme}`,
    subtitle: `预计 ${_plan.totalMinutes} 分钟`,
    content: `
      <div style="text-align:center; margin: var(--space-md) 0;">
        <div class="timer" id="session-timer">0:00</div>
        <div class="controls controls--center" style="margin-top: var(--space-md);">
          <button class="btn btn--primary btn--large" id="timer-toggle-btn">
            开始练习
          </button>
        </div>
      </div>
    `
  });
  _container.appendChild(timerCard);

  _timerEl = timerCard.querySelector('#session-timer');
  const timerBtn = timerCard.querySelector('#timer-toggle-btn');
  timerBtn.addEventListener('click', async () => {
    // Ensure AudioContext on first click
    await audioEngine.ensureContext();
    Timer.toggle();
    timerBtn.textContent = Timer.running ? '暂停' : '继续练习';
    timerBtn.classList.toggle('btn--primary', !Timer.running);
    timerBtn.classList.toggle('btn--secondary', Timer.running);
  });
  if (Timer.elapsed > 0) {
    _timerEl.textContent = formatTime(Timer.elapsed);
    timerBtn.textContent = Timer.running ? '暂停' : '继续练习';
  }

  // Teacher notes
  if (_lesson.teacherNotes) {
    _container.appendChild(createTip(_lesson.teacherNotes, '👩‍🏫'));
  }

  // Exercise sections
  _plan.sections.forEach(section => {
    const isCompleted = Tracking.isSectionCompleted(_lesson.weekOf, _dayNumber, section.id);
    const card = renderSection(section, isCompleted);
    _container.appendChild(card);
  });

  // Complete day button
  const allSectionIds = _plan.sections.map(s => s.id);
  const allDone = Tracking.isDayCompleted(_lesson.weekOf, _dayNumber, allSectionIds);
  if (!allDone) {
    const completeBtn = createElement('button', 'btn btn--primary btn--large btn--full',
      '完成今日练习 ⭐');
    completeBtn.style.marginTop = 'var(--space-lg)';
    completeBtn.addEventListener('click', () => {
      allSectionIds.forEach(id => {
        if (!Tracking.isSectionCompleted(_lesson.weekOf, _dayNumber, id)) {
          Tracking.toggleSection(_lesson.weekOf, _dayNumber, id);
        }
      });
      Tracking.markDayPracticed(_lesson.weekOf, _dayNumber, Timer.elapsed);
      Timer.reset();
      render();
    });
    _container.appendChild(completeBtn);
  } else {
    const doneMsg = createElement('div', 'tip', `
      <span class="tip__icon">🌟</span>
      <span>今天的练习已完成，你太棒了！明天继续加油！</span>
    `);
    doneMsg.style.marginTop = 'var(--space-lg)';
    _container.appendChild(doneMsg);
  }
}

function renderSection(section, isCompleted) {
  const modeLabel = section.mode === 'pizzicato' ? '拨弦 (pizz.)'
    : section.mode === 'arco' ? '拉弓 (arco)'
    : section.mode === 'both' ? '拨弦 + 拉弓'
    : '';

  const badgeText = section.type === 'warmup' ? `${section.durationMinutes}分钟`
    : section.type === 'cooldown' ? `${section.durationMinutes}分钟`
    : section.bpm ? `♩=${section.bpm}` : `${section.durationMinutes}分钟`;

  const card = createCard({
    title: `${section.icon} ${section.title}`,
    subtitle: modeLabel,
    badge: badgeText,
    completed: isCompleted,
  });

  // Focus tip
  if (section.focus) {
    card.appendChild(createTip(section.focus));
  }

  // Score display for pieces
  if (section.measures) {
    renderPieceSection(card, section);
  }

  // Open strings display
  if (section.strings) {
    renderStringsSection(card, section);
  }

  // Recording list for this section
  renderRecordingSection(card, section);

  // Completion checkbox
  const checkboxContainer = createElement('div', '', '');
  checkboxContainer.style.marginTop = 'var(--space-md)';
  checkboxContainer.style.borderTop = `1px solid var(--color-border)`;
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
  const scoreContainer = createElement('div', '', '');
  scoreContainer.style.margin = `var(--space-md) 0`;
  scoreContainer.style.overflowX = 'auto';
  const score = createScoreDisplay(section.measures);
  score.id = `score-${section.id}`;
  scoreContainer.appendChild(score);
  card.appendChild(scoreContainer);

  // Current speed factor for this section
  _currentSpeedFactors[section.id] = section.bpmFactor || 0.5;

  // Speed & BPM controls
  const controls = createElement('div', 'controls', '');
  controls.style.marginTop = 'var(--space-sm)';

  const speedGroup = createSpeedGroup([0.5, 0.75, 1], _currentSpeedFactors[section.id], (speed) => {
    _currentSpeedFactors[section.id] = speed;
    const bpmDisplay = controls.querySelector('.bpm-display');
    const newBpm = Math.round(section.baseBpm * speed);
    if (bpmDisplay) bpmDisplay.textContent = `♩=${newBpm}`;
  });
  controls.appendChild(speedGroup);

  const bpmEl = createElement('span', 'bpm-display', `♩=${section.bpm}`);
  controls.appendChild(bpmEl);
  card.appendChild(controls);

  // Metronome visual
  const metVisual = createElement('div', 'metronome-visual');
  metVisual.id = `met-visual-${section.id}`;
  metVisual.style.margin = 'var(--space-sm) 0';
  metVisual.style.display = 'none';
  for (let i = 0; i < (section.timeSignature?.[0] || 4); i++) {
    metVisual.appendChild(createElement('div', 'metronome-beat'));
  }
  card.appendChild(metVisual);

  // Action buttons row
  const btnRow = createElement('div', 'controls', '');
  btnRow.style.marginTop = 'var(--space-sm)';

  // Play button
  const playBtn = createElement('button', 'btn btn--secondary', '▶ 播放示范');
  playBtn.addEventListener('click', () => {
    if (audioEngine.isPlaying) {
      audioEngine.stop();
      playBtn.textContent = '▶ 播放示范';
      playBtn.classList.remove('btn--primary');
      playBtn.classList.add('btn--secondary');
      return;
    }
    const speed = _currentSpeedFactors[section.id] || 1;
    const scoreEl = document.getElementById(`score-${section.id}`);
    playBtn.textContent = '⏹ 停止';
    playBtn.classList.remove('btn--secondary');
    playBtn.classList.add('btn--primary');

    audioEngine.playSequence(section.measures, section.baseBpm, {
      speedFactor: speed,
      onNoteStart(idx) {
        const noteEls = scoreEl?.querySelectorAll('.score__note');
        noteEls?.forEach((el, i) => {
          el.classList.toggle('score__note--active', i === idx);
          if (i < idx) el.classList.add('score__note--played');
        });
      },
      onNoteEnd() {}
    });

    // Reset when done
    EventBus.on('audio:stop', function onStop() {
      playBtn.textContent = '▶ 播放示范';
      playBtn.classList.remove('btn--primary');
      playBtn.classList.add('btn--secondary');
      const noteEls = scoreEl?.querySelectorAll('.score__note');
      noteEls?.forEach(el => {
        el.classList.remove('score__note--active', 'score__note--played');
      });
      EventBus.off('audio:stop', onStop);
    });
  });
  btnRow.appendChild(playBtn);

  // Metronome button
  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.addEventListener('click', () => {
    const speed = _currentSpeedFactors[section.id] || 1;
    const bpm = Math.round(section.baseBpm * speed);
    const beats = section.timeSignature?.[0] || 4;
    const visual = document.getElementById(`met-visual-${section.id}`);

    if (metronome.running) {
      metronome.stop();
      metBtn.textContent = '🔔 节拍器';
      metBtn.classList.remove('btn--recording');
      if (visual) visual.style.display = 'none';
    } else {
      metronome.start(bpm, beats);
      metBtn.textContent = '⏹ 停止节拍器';
      metBtn.classList.add('btn--recording');
      if (visual) visual.style.display = 'flex';
    }
  });
  btnRow.appendChild(metBtn);

  // Record button
  const recBtn = createRecordButton(section.id);
  btnRow.appendChild(recBtn);

  card.appendChild(btnRow);
}

function renderStringsSection(card, section) {
  const stringsEl = createElement('div', 'controls controls--center', '');
  stringsEl.style.margin = `var(--space-md) 0`;
  stringsEl.style.gap = 'var(--space-md)';

  section.strings.forEach(s => {
    const btn = createElement('button', 'btn btn--secondary', '');
    btn.style.flexDirection = 'column';
    btn.style.minWidth = '64px';
    btn.style.borderLeft = `4px solid ${s.color}`;
    btn.innerHTML = `
      <strong style="font-size: var(--font-size-xl);">${s.name}</strong>
      <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${s.solfege}</span>
    `;
    btn.addEventListener('click', () => {
      audioEngine.playNote(s.pitch, 2);
      // Visual feedback
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = `0 0 0 3px ${s.color}40`;
      setTimeout(() => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
      }, 2000);
    });
    stringsEl.appendChild(btn);
  });
  card.appendChild(stringsEl);

  // Buttons row
  const btnRow = createElement('div', 'controls controls--center', '');

  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.addEventListener('click', () => {
    if (metronome.running) {
      metronome.stop();
      metBtn.textContent = '🔔 节拍器';
    } else {
      metronome.start(section.bpm, 4);
      metBtn.textContent = '⏹ 停止';
    }
  });
  btnRow.appendChild(metBtn);

  const recBtn = createRecordButton(section.id);
  btnRow.appendChild(recBtn);
  card.appendChild(btnRow);
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
      } catch (e) {
        alert('无法访问麦克风，请检查权限设置');
        console.error('Recording error:', e);
      }
    } else {
      const meta = await Recorder.stopRecording();
      recording = false;
      recBtn.textContent = '🎤 录音';
      recBtn.classList.remove('btn--recording');
      if (meta) {
        // Refresh recording list in parent card
        const listEl = recBtn.closest('.card')?.querySelector('.recording-list');
        if (listEl) refreshRecordingList(listEl, exerciseId);
      }
    }
  });
  return recBtn;
}

function renderRecordingSection(card, section) {
  if (section.type === 'warmup' || section.type === 'cooldown') return;

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

  listEl.innerHTML = `<div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:var(--space-xs);">
    🎤 今日录音 (${recordings.length})
  </div>`;

  recordings.forEach(rec => {
    const item = createElement('div', 'recording-item');
    const time = new Date(rec.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const durSec = Math.round((rec.durationMs || 0) / 1000);

    item.innerHTML = `
      <div class="recording-item__info">
        <div class="recording-item__time">${time}</div>
        <div class="recording-item__duration">${durSec}秒</div>
      </div>
    `;

    const playBtn = createElement('button', 'btn btn--icon btn--ghost', '▶');
    playBtn.addEventListener('click', () => {
      Recorder.playRecording(rec.id);
      playBtn.textContent = '⏹';
      // Reset after likely playback time
      setTimeout(() => { playBtn.textContent = '▶'; }, (rec.durationMs || 5000) + 500);
    });
    item.appendChild(playBtn);

    const delBtn = createElement('button', 'btn btn--icon btn--ghost', '🗑');
    delBtn.addEventListener('click', async () => {
      if (confirm('删除这条录音？')) {
        await Recorder.deleteRecording(rec.id);
        refreshRecordingList(listEl, exerciseId);
      }
    });
    item.appendChild(delBtn);

    listEl.appendChild(item);
  });
}

function onTimerTick(elapsed) {
  if (_timerEl) _timerEl.textContent = formatTime(elapsed);
}

function onMetronomeBeat({ beat, isAccent, total }) {
  // Update all visible metronome visuals
  document.querySelectorAll('.metronome-visual').forEach(visual => {
    if (visual.style.display === 'none') return;
    const dots = visual.querySelectorAll('.metronome-beat');
    dots.forEach((dot, i) => {
      dot.classList.remove('metronome-beat--active', 'metronome-beat--accent');
      if (i === beat) {
        dot.classList.add(isAccent ? 'metronome-beat--accent' : 'metronome-beat--active');
      }
    });
  });
}
