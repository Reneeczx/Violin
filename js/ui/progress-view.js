import { createElement } from './components.js';
import State from '../state.js';
import Tracking from '../tracking.js';

let _container = null;

export function init(container) {
  _container = container;
}

export function show() {
  const stats = State.getStats();
  const lesson = window.CURRENT_LESSON;
  const completedDays = lesson ? Tracking.getCompletedDays(lesson.weekOf) : [];

  _container.innerHTML = '';

  // Stats header
  const statsCard = createElement('div', 'card');
  statsCard.innerHTML = `
    <div style="text-align:center;">
      <h2>我的进度</h2>
      <div style="margin-top: var(--space-lg); display: flex; justify-content: space-around;">
        <div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--color-primary);">
            ${stats.currentStreak}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            🔥 连续天数
          </div>
        </div>
        <div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--color-accent);">
            ${stats.totalPracticeDays}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            📅 总练习天数
          </div>
        </div>
        <div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--color-success);">
            ${stats.totalPracticeMinutes}
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            ⏱ 总分钟数
          </div>
        </div>
      </div>
    </div>
  `;
  _container.appendChild(statsCard);

  // Longest streak
  if (stats.longestStreak > 0) {
    const streakCard = createElement('div', 'card');
    streakCard.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">最长连续练习</div>
        <div style="font-size: 1.5rem; font-weight: bold; color: var(--color-primary); margin-top: var(--space-xs);">
          🏆 ${stats.longestStreak} 天
        </div>
      </div>
    `;
    _container.appendChild(streakCard);
  }

  // This week progress
  if (lesson) {
    const weekCard = createElement('div', 'card');
    weekCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">📊 本周进度</div>
        <span class="card__badge">${completedDays.length}/7</span>
      </div>
      <div style="margin-top: var(--space-sm);">
        ${renderWeekBar(completedDays)}
      </div>
    `;
    _container.appendChild(weekCard);
  }

  // Achievements
  const achievementsCard = createElement('div', 'card');
  achievementsCard.innerHTML = `
    <div class="card__title">🌟 成就</div>
    <div style="margin-top: var(--space-md); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
      ${renderAchievement('🎵', '第一次练习', stats.totalPracticeDays >= 1)}
      ${renderAchievement('🔥', '连续3天', stats.longestStreak >= 3)}
      ${renderAchievement('⭐', '连续7天', stats.longestStreak >= 7)}
      ${renderAchievement('🏅', '练习10天', stats.totalPracticeDays >= 10)}
      ${renderAchievement('💎', '练习30天', stats.totalPracticeDays >= 30)}
      ${renderAchievement('🎻', '累计60分钟', stats.totalPracticeMinutes >= 60)}
    </div>
  `;
  _container.appendChild(achievementsCard);

  // Motivational message
  const messages = [
    '每天进步一点点，积少成多！',
    '坚持就是胜利，你做得很好！',
    '音乐是最美的语言，继续加油！',
    '今天的汗水，是明天的掌声！',
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const msgEl = createElement('div', 'tip', `
    <span class="tip__icon">💪</span>
    <span>${msg}</span>
  `);
  msgEl.style.marginTop = 'var(--space-md)';
  _container.appendChild(msgEl);
}

function renderWeekBar(completedDays) {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  return `<div style="display:flex; gap:var(--space-xs); align-items:flex-end;">
    ${days.map((label, i) => {
      const dayNum = i + 1;
      const done = completedDays.includes(dayNum);
      return `<div style="flex:1; text-align:center;">
        <div style="height:${done ? 40 : 20}px; background:${done ? 'var(--color-success)' : 'var(--color-border)'}; border-radius:4px; transition: all 300ms;"></div>
        <div style="font-size:var(--font-size-xs); margin-top:4px; color:${done ? 'var(--color-success)' : 'var(--color-text-light)'};">${label}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderAchievement(icon, label, unlocked) {
  return `<div style="text-align:center; padding:var(--space-md); border-radius:var(--radius-md); background:${unlocked ? 'var(--color-primary-bg)' : 'var(--color-bg)'}; opacity:${unlocked ? 1 : 0.4};">
    <div style="font-size:1.5rem;">${icon}</div>
    <div style="font-size:var(--font-size-xs); margin-top:var(--space-xs); color:${unlocked ? 'var(--color-text)' : 'var(--color-text-light)'};">${label}</div>
  </div>`;
}

export function hide() {}
