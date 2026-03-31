import { getWeekOverview } from '../practice-plan.js';
import { getLessonCatalog } from '../lesson-catalog.js';
import { createElement, createCard, createTip, formatTime } from './components.js';
import Tracking from '../tracking.js';

let _container = null;
let _catalog = null;
let _selectedWeekOf = null;
let _selectedDayByWeek = {};

export function init(container) {
  _container = container;
}

export function show() {
  _catalog = getLessonCatalog();

  if (!_catalog.lessons.length) {
    _container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📜</div>
        <div class="empty-state__text">还没有可显示的周计划</div>
      </div>
    `;
    return;
  }

  const currentLesson = _catalog.lessons.find((lesson) => lesson.isCurrent) || _catalog.lessons[0];
  if (!_selectedWeekOf || !_catalog.byWeekOf[_selectedWeekOf]) {
    _selectedWeekOf = currentLesson.weekOf;
  }

  ensureSelectedDay(_selectedWeekOf);
  render();
}

export function hide() {}

function render() {
  const lesson = _catalog.byWeekOf[_selectedWeekOf];
  const overview = getWeekOverview(lesson);
  const trackingAvailable = Tracking.hasWeekRecord(lesson.weekOf);
  const completedDays = trackingAvailable ? Tracking.getCompletedDays(lesson.weekOf) : [];
  const selectedDayNumber = _selectedDayByWeek[lesson.weekOf] || 1;
  const selectedDay = overview.find((day) => day.dayNumber === selectedDayNumber) || overview[0];

  _container.innerHTML = '';

  const header = createElement('div', '', `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <h2 style="margin-bottom: var(--space-sm);">计划与归档</h2>
    </div>
  `);
  _container.appendChild(header);
  _container.appendChild(renderWeekTabs());

  const lessonCard = createCard({
    title: lesson.title,
    subtitle: `${formatWeekRange(lesson.weekOf)}${lesson.planKind === 'review' ? ' · 复习周' : ''}`,
    badge: formatLessonBadge(lesson, completedDays.length, trackingAvailable),
  });

  if (lesson.historySource === 'embedded-baseline') {
    lessonCard.appendChild(createTip('这是最近一周真实上课内容的只读基线。在本周正式发布前，你可以先回看上一周的作业安排。', '🪜'));
  } else if (!lesson.isPublished) {
    lessonCard.appendChild(createTip('当前显示的是仓库内置默认周；只有从作者页正式发布后的周才会进入历史目录。', '🧪'));
  }

  if (!lesson.isCurrent) {
    lessonCard.appendChild(createTip('历史周是只读归档：可以回看正式作业和已有记录，但不会在这里继续改状态。', '📎'));
  }

  if (lesson.planKind === 'review') {
    lessonCard.appendChild(createTip('这是一个手动触发的复习周：任务会优先覆盖近期未完成或反复出现的基础项。', '🔁'));
  }

  if (!trackingAvailable) {
    lessonCard.appendChild(createTip('这周没有找到本机完成记录，下面展示的是正式作业安排。', '🗂️'));
  }

  if (lesson.teacherNotes) {
    lessonCard.appendChild(createTip(lesson.teacherNotes, '👩‍🏫'));
  }

  _container.appendChild(lessonCard);
  _container.appendChild(renderCalendar(lesson, overview, completedDays, selectedDayNumber));
  _container.appendChild(renderDayDetail(lesson, selectedDay, completedDays.includes(selectedDay.dayNumber), trackingAvailable));
}

function renderWeekTabs() {
  const host = createElement('div', 'week-switcher', '');

  _catalog.lessons.forEach((lesson) => {
    const button = createElement(
      'button',
      `week-switcher__chip${lesson.weekOf === _selectedWeekOf ? ' week-switcher__chip--active' : ''}`,
      `
        <span class="week-switcher__eyebrow">${lesson.isCurrent ? '本周' : formatShortWeek(lesson.weekOf)}</span>
        <span class="week-switcher__title">${escapeHtml(lesson.title)}</span>
      `,
    );
    button.type = 'button';
    button.addEventListener('click', () => {
      _selectedWeekOf = lesson.weekOf;
      ensureSelectedDay(lesson.weekOf);
      render();
    });
    host.appendChild(button);
  });

  return host;
}

function renderCalendar(lesson, overview, completedDays, selectedDayNumber) {
  const grid = createElement('div', 'calendar', '');
  const currentDayNumber = lesson.isCurrent ? getTodayDayNumberInWeek(lesson.weekOf) : null;
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  dayLabels.forEach((label) => {
    grid.appendChild(createElement('div', 'calendar__day-label', label));
  });

  overview.forEach((day) => {
    const isCompleted = completedDays.includes(day.dayNumber);
    const isToday = currentDayNumber === day.dayNumber;
    const isSelected = selectedDayNumber === day.dayNumber;

    let className = 'calendar__day';
    if (isToday) className += ' calendar__day--today';
    if (isCompleted) className += ' calendar__day--completed';
    if (isToday && !isCompleted) className += ' calendar__day--current';
    if (isSelected) className += ' calendar__day--selected';
    if (day.dayStatus === 'inactive') className += ' calendar__day--inactive';

    const secondaryLabel = isCompleted
      ? '✓'
      : day.dayStatus === 'inactive'
        ? '发布前'
        : isToday
          ? '今天'
          : '';

    const dayButton = createElement('button', className, `
      <div>${day.date.getDate()}</div>
      <div style="font-size:var(--font-size-xs);">${secondaryLabel}</div>
    `);
    dayButton.type = 'button';
    dayButton.addEventListener('click', () => {
      _selectedDayByWeek[lesson.weekOf] = day.dayNumber;
      render();
    });
    grid.appendChild(dayButton);
  });

  return grid;
}

function renderDayDetail(lesson, day, isCompleted, trackingAvailable) {
  const dateStr = day.date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const summary = trackingAvailable ? Tracking.getDaySummary(lesson.weekOf, day.dayNumber) : null;
  const badge = day.dayStatus === 'inactive'
    ? '发布前'
    : isCompleted
      ? '已完成'
      : `${day.totalMinutes} 分钟`;

  const card = createCard({
    title: `第 ${day.dayNumber} 天`,
    subtitle: dateStr,
    badge,
    completed: isCompleted,
    content: `
      <div style="margin-top: var(--space-sm);">
        <div class="tip" style="margin-bottom: var(--space-sm);">
          <span class="tip__icon">🎯</span>
          <span>${escapeHtml(day.theme || '未设置主题')}</span>
        </div>
        ${day.sections.length
          ? day.sections.map((section) => `
            <div style="padding: var(--space-xs) 0; font-size: var(--font-size-sm);">
              <strong>${escapeHtml(section.title)}</strong>
              ${section.focus ? `<div style="color: var(--color-text-secondary);">${escapeHtml(section.focus)}</div>` : ''}
            </div>
          `).join('')
          : '<div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">这一天没有可执行任务。</div>'}
      </div>
    `,
  });

  if (day.dayStatus === 'inactive') {
    card.appendChild(createTip('这一天还在计划发布前，因此不会显示可执行任务，也不会生成完成状态。', '🕰️'));
    return card;
  }

  if (!trackingAvailable) {
    card.appendChild(createTip('这一天只有正式作业安排，没有找到本机完成记录。', '🗂️'));
    return card;
  }

  if (!summary?.completedAt) {
    card.appendChild(createTip('这一天还没有标记为完成，可以把它当作查看老师作业安排的参考。', '📝'));
    return card;
  }

  const completedAt = new Date(summary.completedAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const spentSeconds = summary.totalSeconds || 0;
  card.appendChild(createTip(`完成时间：${completedAt} · 练习时长：${formatTime(spentSeconds)}`, '✅'));
  return card;
}

function ensureSelectedDay(weekOf) {
  if (_selectedDayByWeek[weekOf]) {
    return;
  }

  const lesson = _catalog.byWeekOf[weekOf];
  const overview = getWeekOverview(lesson);
  const trackingAvailable = Tracking.hasWeekRecord(weekOf);
  const completedDays = trackingAvailable ? Tracking.getCompletedDays(weekOf) : [];
  const todayDayNumber = lesson.isCurrent ? getTodayDayNumberInWeek(lesson.weekOf) : null;
  const firstActiveDay = overview.find((day) => day.dayStatus !== 'inactive')?.dayNumber || 1;

  if (todayDayNumber) {
    const todayPlan = overview.find((day) => day.dayNumber === todayDayNumber);
    _selectedDayByWeek[weekOf] = todayPlan?.dayStatus === 'inactive'
      ? firstActiveDay
      : todayDayNumber;
    return;
  }

  _selectedDayByWeek[weekOf] = completedDays.at(-1) || firstActiveDay;
}

function formatLessonBadge(lesson, completedDayCount, trackingAvailable) {
  if (lesson.isCurrent) {
    return `本周 · ${completedDayCount}/7 天`;
  }

  if (lesson.historySource === 'embedded-baseline') {
    return trackingAvailable
      ? `上一周基线 · ${completedDayCount}/7 天`
      : '上一周基线 · 作业回看';
  }

  if (trackingAvailable) {
    return `历史周 · ${completedDayCount}/7 天`;
  }

  return '历史周 · 作业归档';
}

function getTodayDayNumberInWeek(weekOf, today = new Date()) {
  const start = new Date(`${weekOf}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayStart - start) / 86400000);

  if (diffDays < 0 || diffDays > 6) {
    return null;
  }

  return diffDays + 1;
}

function formatWeekRange(weekOf) {
  const start = new Date(`${weekOf}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const options = { month: 'numeric', day: 'numeric' };
  return `${start.toLocaleDateString('zh-CN', options)} - ${end.toLocaleDateString('zh-CN', options)}`;
}

function formatShortWeek(weekOf) {
  const date = new Date(`${weekOf}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
