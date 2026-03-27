import { createElement, createTip } from './components.js';
import EventBus from '../event-bus.js';
import audioEngine from '../audio-engine.js';
import practicePlayer from '../practice-player.js';
import { getOpenStrings } from '../open-string-data.js';
import {
  getSilentModeHintText,
  shouldShowSilentModeHint,
} from '../audio-support.js';

let _container = null;
let _playAllToken = 0;

export function init(container) {
  _container = container;
}

export function show() {
  render();
  EventBus.on('practice:statechange', syncReferenceUi);
  syncReferenceUi();
}

export function hide() {
  EventBus.off('practice:statechange', syncReferenceUi);
  _playAllToken += 1;
  practicePlayer.stop();
  audioEngine.stop();
}

function render() {
  const strings = getOpenStrings();

  _container.innerHTML = `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <h2>调弦助手</h2>
      <div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-top:var(--space-xs);">
        点击琴弦名称，循环听标准音；再点一次即可停止。
      </div>
    </div>
    <div style="text-align:center; margin-bottom:var(--space-lg);">
      <div style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">
        从高到低：E (Mi) → A (La) → D (Re) → G (Sol)
      </div>
    </div>
  `;

  const stringsGrid = createElement('div', '');
  stringsGrid.style.display = 'grid';
  stringsGrid.style.gridTemplateColumns = '1fr 1fr';
  stringsGrid.style.gap = 'var(--space-md)';
  stringsGrid.style.maxWidth = '400px';
  stringsGrid.style.margin = '0 auto';

  strings.forEach((stringData) => {
    const card = createElement('button', 'card');
    card.style.textAlign = 'center';
    card.style.padding = 'var(--space-xl) var(--space-lg)';
    card.style.cursor = 'pointer';
    card.style.borderLeft = `5px solid ${stringData.color}`;
    card.style.transition = 'all var(--transition-fast)';
    card.dataset.tunerPitch = stringData.pitch;
    card.dataset.tunerColor = stringData.color;

    card.innerHTML = `
      <div style="font-size: 2.5rem; font-weight: bold; color: ${stringData.color};">${stringData.name}</div>
      <div style="font-size: var(--font-size-lg); margin-top: var(--space-xs);">${stringData.solfege}</div>
      <div style="font-size: var(--font-size-xs); color: var(--color-text-light); margin-top: var(--space-xs);">
        ${stringData.freq} Hz
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-sm);">
        第 ${stringData.order} 根弦${describeStringOrder(stringData.order)}
      </div>
    `;

    card.addEventListener('click', async () => {
      await audioEngine.ensureContext();
      await toggleStringReference(stringData.pitch);
    });
    stringsGrid.appendChild(card);
  });

  _container.appendChild(stringsGrid);

  if (shouldShowSilentModeHint()) {
    const audioHint = createTip(getSilentModeHintText(), '🔇');
    audioHint.style.maxWidth = '400px';
    audioHint.style.margin = 'var(--space-lg) auto 0';
    _container.appendChild(audioHint);
  }

  const playAllBtn = createElement('button', 'btn btn--primary btn--large btn--full', '▶ 依次播放全部');
  playAllBtn.style.marginTop = 'var(--space-xl)';
  playAllBtn.style.maxWidth = '400px';
  playAllBtn.style.marginLeft = 'auto';
  playAllBtn.style.marginRight = 'auto';
  playAllBtn.style.display = 'flex';
  playAllBtn.id = 'tuner-play-all-btn';
  playAllBtn.addEventListener('click', async () => {
    await audioEngine.ensureContext();
    await playAllStrings(strings);
  });
  _container.appendChild(playAllBtn);

  const tips = createElement('div', '', `
    <div class="card" style="margin-top: var(--space-xl);">
      <div class="card__title">📃 调弦小贴士</div>
      <ul style="margin-top: var(--space-sm); padding-left: var(--space-lg); list-style: disc;">
        <li style="margin-bottom: var(--space-xs);">先调 A 弦（标准音 440Hz），再调其他弦。</li>
        <li style="margin-bottom: var(--space-xs);">转弦轴时动作要小，慢慢调。</li>
        <li style="margin-bottom: var(--space-xs);">两个音听起来越“融合”，波动越少，就越接近准音。</li>
        <li>刚开始可以请老师或家长协助调弦。</li>
      </ul>
    </div>
  `);
  _container.appendChild(tips);
}

function describeStringOrder(order) {
  if (order === 1) {
    return '（最细）';
  }
  if (order === 4) {
    return '（最粗）';
  }
  return '';
}

async function toggleStringReference(pitch) {
  _playAllToken += 1;

  if (practicePlayer.isReferencePlaying('tuner', pitch)) {
    practicePlayer.stop();
    return;
  }

  audioEngine.stop();
  await practicePlayer.startReference({
    sectionId: 'tuner',
    pitch,
  });
}

function syncReferenceUi() {
  const state = practicePlayer.state;

  document.querySelectorAll('[data-tuner-pitch]').forEach((card) => {
    const isActive = state.mode === 'reference'
      && state.sectionId === 'tuner'
      && state.pitch === card.dataset.tunerPitch;
    card.style.transform = isActive ? 'scale(1.05)' : '';
    card.style.boxShadow = isActive ? `0 0 0 3px ${card.dataset.tunerColor}40` : '';
  });
}

async function playAllStrings(strings) {
  _playAllToken += 1;
  const runToken = _playAllToken;
  practicePlayer.stop();
  audioEngine.stop();

  for (const stringData of strings) {
    if (runToken !== _playAllToken) {
      return;
    }

    const card = document.querySelector(`[data-tuner-pitch="${stringData.pitch}"]`);
    if (!card) {
      continue;
    }

    card.style.transform = 'scale(1.05)';
    card.style.boxShadow = `0 0 0 3px ${stringData.color}40`;

    await audioEngine.ensureContext();
    await audioEngine.playNote(stringData.pitch, 3.2);
    await wait(3200);

    card.style.transform = '';
    card.style.boxShadow = '';
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
