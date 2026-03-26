import { buildScoreModel } from '../score-utils.js';

export function createElement(tag, className, innerHTML) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

export function createCard({ title, subtitle, badge, completed, active, content }) {
  const card = createElement('div', 'card');
  if (completed) card.classList.add('card--completed');
  if (active) card.classList.add('card--active');

  let headerHTML = '';
  if (title || badge) {
    headerHTML = `
      <div class="card__header">
        <div>
          <div class="card__title">${title || ''}</div>
          ${subtitle ? `<div class="card__subtitle">${subtitle}</div>` : ''}
        </div>
        ${badge ? `<span class="card__badge">${badge}</span>` : ''}
      </div>
    `;
  }

  card.innerHTML = headerHTML;
  if (content) {
    if (typeof content === 'string') {
      card.innerHTML += content;
    } else {
      card.appendChild(content);
    }
  }

  return card;
}

export function createProgressDots(total, current, completedDays = []) {
  const container = createElement('div', 'progress-dots');
  for (let i = 1; i <= total; i += 1) {
    const dot = createElement('div', 'progress-dot');
    if (completedDays.includes(i)) dot.classList.add('progress-dot--done');
    if (i === current) dot.classList.add('progress-dot--current');
    container.appendChild(dot);
  }
  return container;
}

export function createCheckbox(label, checked, onChange) {
  const container = createElement('div', `checkbox${checked ? ' checkbox--checked' : ''}`);
  container.innerHTML = `
    <div class="checkbox__box">${checked ? '&#10003;' : ''}</div>
    <span class="checkbox__label">${label}</span>
  `;

  container.addEventListener('click', () => {
    checked = !checked;
    container.classList.toggle('checkbox--checked', checked);
    container.querySelector('.checkbox__box').innerHTML = checked ? '&#10003;' : '';
    onChange?.(checked);
  });

  return container;
}

export function createTip(text, icon = '💡') {
  return createElement('div', 'tip', `
    <span class="tip__icon">${icon}</span>
    <span>${text}</span>
  `);
}

export function createSpeedGroup(speedOptions, currentSpeed, onSelect) {
  const group = createElement('div', 'speed-group');

  speedOptions.forEach((speedOption) => {
    const speed = typeof speedOption === 'number' ? speedOption : speedOption.value;
    const label = typeof speedOption === 'number'
      ? (speed === 1 ? '原速' : `${Math.round(speed * 100)}%`)
      : speedOption.label;

    const btn = createElement('button', `speed-btn${speed === currentSpeed ? ' active' : ''}`, label);
    btn.dataset.speedValue = String(speed);
    btn.addEventListener('click', () => {
      group.querySelectorAll('.speed-btn').forEach((button) => button.classList.remove('active'));
      btn.classList.add('active');
      onSelect(speed);
    });
    group.appendChild(btn);
  });

  return group;
}

export function createScoreDisplay(measures, { beatsPerMeasure = 4, showBeatNumbers = false } = {}) {
  const container = createElement('div', 'score');

  buildScoreModel(measures, { beatsPerMeasure }).forEach((measure) => {
    const measureEl = createElement('div', 'score__measure');
    measureEl.dataset.measureIndex = String(measure.measureIndex);
    measureEl.style.setProperty('--score-grid-columns', String(measure.gridUnits));

    if (showBeatNumbers) {
      const beatsEl = createElement('div', 'score__beats');
      beatsEl.style.setProperty('--score-grid-columns', String(measure.gridUnits));

      measure.beatLabels.forEach((beat) => {
        const beatEl = createElement('div', 'score__beat', String(beat.beatNumber));
        beatEl.dataset.measureIndex = String(measure.measureIndex);
        beatEl.dataset.beatNumber = String(beat.beatNumber);
        beatEl.style.gridColumn = `${beat.gridColumnStart} / span ${beat.gridColumnSpan}`;
        beatsEl.appendChild(beatEl);
      });

      measureEl.appendChild(beatsEl);
    }

    const notesEl = createElement('div', 'score__notes');
    notesEl.style.setProperty('--score-grid-columns', String(measure.gridUnits));

    measure.cells.forEach((cell) => {
      const noteEl = createElement('div', `score__note${cell.isRest ? ' score__note--rest' : ''}`);
      noteEl.dataset.noteIndex = String(cell.noteIndex);
      noteEl.dataset.measureIndex = String(cell.measureIndex);
      noteEl.dataset.startBeat = String(cell.startBeat);
      noteEl.style.gridColumn = `span ${cell.spanUnits}`;
      noteEl.innerHTML = `
        <span class="score__pitch">${cell.pitchName}</span>
        <span class="score__duration">${durationLabel(cell.duration)}</span>
      `;
      notesEl.appendChild(noteEl);
    });

    measureEl.appendChild(notesEl);
    container.appendChild(measureEl);
  });

  return container;
}

function durationLabel(duration) {
  const map = {
    whole: '𝅝',
    half: '𝅗𝅥',
    quarter: '♩',
    eighth: '♪',
  };
  return map[duration] || duration;
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
