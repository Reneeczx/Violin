import { getWeekOverview } from '../practice-plan.js';
import { createElement, createCard, createTip } from './components.js';
import Tracking from '../tracking.js';

let _container = null;

export function init(container) {
  _container = container;
}

export function show() {
  const lesson = window.CURRENT_LESSON;
  if (!lesson) {
    _container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📭</div><div class="empty-state__text">还没有课程数据</div></div>';
    return;
  }

  const overview = getWeekOverview(lesson);
  const completedDays = Tracking.getCompletedDays(lesson.weekOf);
  const today = new Date();

  _container.innerHTML = `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <h2>${lesson.title}</h2>
      <div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-top:var(--space-xs);">
        ${lesson.weekOf} 起 · 已完成 ${completedDays.length}/7 天
      </div>
    </div>
  `;

  // Week calendar grid
  const grid = createElement('div', 'calendar');
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  dayLabels.forEach(label => {
    grid.appendChild(createElement('div', 'calendar__day-label', label));
  });

  overview.forEach(day => {
    const isCompleted = completedDays.includes(day.dayNumber);
    const isToday = day.date.toDateString() === today.toDateString();
    const isPast = day.date < today && !isToday;

    let cls = 'calendar__day';
    if (isToday) cls += ' calendar__day--today';
    if (isCompleted) cls += ' calendar__day--completed';
    if (isToday && !isCompleted) cls += ' calendar__day--current';

    const dayEl = createElement('div', cls, `
      <div>${day.date.getDate()}</div>
      <div style="font-size:var(--font-size-xs);">${isCompleted ? '✓' : isPast && !isCompleted ? '·' : ''}</div>
    `);

    dayEl.addEventListener('click', () => {
      showDayDetail(day, isCompleted);
    });

    grid.appendChild(dayEl);
  });

  _container.appendChild(grid);

  // Day details below calendar
  const detailContainer = createElement('div', '', '');
  detailContainer.id = 'day-detail';
  detailContainer.style.marginTop = 'var(--space-lg)';
  _container.appendChild(detailContainer);

  // Show today's detail by default
  const todayOverview = overview.find(d => d.date.toDateString() === today.toDateString());
  if (todayOverview) {
    showDayDetail(todayOverview, completedDays.includes(todayOverview.dayNumber));
  }
}

function showDayDetail(day, isCompleted) {
  const container = document.getElementById('day-detail');
  if (!container) return;

  const dateStr = day.date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  container.innerHTML = '';

  const card = createCard({
    title: `第 ${day.dayNumber} 天`,
    subtitle: dateStr,
    badge: isCompleted ? '✓ 已完成' : `${day.totalMinutes}分钟`,
    completed: isCompleted,
    content: `
      <div style="margin-top: var(--space-sm);">
        <div class="tip" style="margin-bottom: var(--space-sm);">
          <span class="tip__icon">🎯</span>
          <span>${day.theme}</span>
        </div>
        ${day.sections.map(s => `
          <div style="padding: var(--space-xs) 0; font-size: var(--font-size-sm);">
            <strong>${s.title}</strong>
            ${s.focus ? `<div style="color: var(--color-text-secondary);">${s.focus}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `
  });

  container.appendChild(card);
}

export function hide() {}
