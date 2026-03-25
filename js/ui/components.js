/** Reusable UI component helpers */

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
    headerHTML = `<div class="card__header">
      <div>
        <div class="card__title">${title || ''}</div>
        ${subtitle ? `<div class="card__subtitle">${subtitle}</div>` : ''}
      </div>
      ${badge ? `<span class="card__badge">${badge}</span>` : ''}
    </div>`;
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
  for (let i = 1; i <= total; i++) {
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

export function createSpeedGroup(speeds, currentSpeed, onSelect) {
  const group = createElement('div', 'speed-group');
  speeds.forEach(speed => {
    const btn = createElement('button', `speed-btn${speed === currentSpeed ? ' active' : ''}`,
      speed === 1 ? '原速' : `${Math.round(speed * 100)}%`);
    btn.addEventListener('click', () => {
      group.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(speed);
    });
    group.appendChild(btn);
  });
  return group;
}

export function createScoreDisplay(measures, options = {}) {
  const container = createElement('div', 'score');
  let noteIndex = 0;

  measures.forEach((measure, mIdx) => {
    if (mIdx > 0) {
      container.appendChild(createElement('div', 'score__barline'));
    }
    measure.notes.forEach(note => {
      const noteEl = createElement('div', 'score__note');
      noteEl.dataset.noteIndex = noteIndex;

      if (note.pitch === 'REST') {
        noteEl.classList.add('score__note--rest');
        noteEl.innerHTML = `
          <span class="score__pitch">-</span>
          <span class="score__duration">${durationLabel(note.duration)}</span>
        `;
      } else {
        const pitchName = note.pitch.replace(/\d/, '');
        noteEl.innerHTML = `
          <span class="score__pitch">${pitchName}</span>
          <span class="score__duration">${durationLabel(note.duration)}</span>
        `;
      }
      container.appendChild(noteEl);
      noteIndex++;
    });
  });

  return container;
}

function durationLabel(duration) {
  const map = { whole: '𝅝', half: '𝅗𝅥', quarter: '♩', eighth: '♪' };
  return map[duration] || duration;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
