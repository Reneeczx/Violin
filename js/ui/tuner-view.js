import { createElement } from './components.js';

let _container = null;
let _currentlyPlaying = null;

const STRINGS = [
  { name: 'E', pitch: 'E5', freq: 659.25, solfege: 'Mi', color: '#E74C3C', order: 1 },
  { name: 'A', pitch: 'A4', freq: 440.00, solfege: 'La', color: '#E8913A', order: 2 },
  { name: 'D', pitch: 'D4', freq: 293.66, solfege: 'Re', color: '#5B8DBE', order: 3 },
  { name: 'G', pitch: 'G3', freq: 196.00, solfege: 'Sol', color: '#6BBF59', order: 4 },
];

export function init(container) {
  _container = container;
}

export function show() {
  _container.innerHTML = `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <h2>调弦助手</h2>
      <div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-top:var(--space-xs);">
        点击琴弦听标准音，对照调弦
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

  STRINGS.forEach(s => {
    const card = createElement('button', 'card');
    card.style.textAlign = 'center';
    card.style.padding = 'var(--space-xl) var(--space-lg)';
    card.style.cursor = 'pointer';
    card.style.borderLeft = `5px solid ${s.color}`;
    card.style.transition = 'all var(--transition-fast)';
    card.id = `string-${s.name}`;

    card.innerHTML = `
      <div style="font-size: 2.5rem; font-weight: bold; color: ${s.color};">${s.name}</div>
      <div style="font-size: var(--font-size-lg); margin-top: var(--space-xs);">${s.solfege}</div>
      <div style="font-size: var(--font-size-xs); color: var(--color-text-light); margin-top: var(--space-xs);">
        ${s.freq} Hz
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-sm);">
        第 ${s.order} 弦${s.order === 1 ? '（最细）' : s.order === 4 ? '（最粗）' : ''}
      </div>
    `;

    card.addEventListener('click', () => playStringReference(s, card));
    stringsGrid.appendChild(card);
  });

  _container.appendChild(stringsGrid);

  // Play all button
  const playAllBtn = createElement('button', 'btn btn--primary btn--large btn--full', '▶ 依次播放全部');
  playAllBtn.style.marginTop = 'var(--space-xl)';
  playAllBtn.style.maxWidth = '400px';
  playAllBtn.style.marginLeft = 'auto';
  playAllBtn.style.marginRight = 'auto';
  playAllBtn.style.display = 'flex';
  playAllBtn.addEventListener('click', () => playAllStrings());
  _container.appendChild(playAllBtn);

  // Instructions
  const tips = createElement('div', '', `
    <div class="card" style="margin-top: var(--space-xl);">
      <div class="card__title">💡 调弦小贴士</div>
      <ul style="margin-top: var(--space-sm); padding-left: var(--space-lg); list-style: disc;">
        <li style="margin-bottom: var(--space-xs);">先调 A 弦（标准音 440Hz），再调其他弦</li>
        <li style="margin-bottom: var(--space-xs);">转动弦轴时动作要小，慢慢调</li>
        <li style="margin-bottom: var(--space-xs);">听两个音是否"融合"在一起，没有"波动感"就是准了</li>
        <li>刚开始可以请老师或家长帮忙调弦</li>
      </ul>
    </div>
  `);
  _container.appendChild(tips);
}

export function hide() {
  stopPlaying();
}

function playStringReference(stringData, cardEl) {
  // Will connect to AudioEngine in Phase 3
  // For now, visual feedback
  stopPlaying();

  cardEl.style.transform = 'scale(1.05)';
  cardEl.style.boxShadow = `0 0 0 3px ${stringData.color}40`;
  _currentlyPlaying = { el: cardEl, stringData };

  // Dispatch event for audio engine to pick up
  window.dispatchEvent(new CustomEvent('play-string', { detail: stringData }));

  // Reset visual after 2 seconds
  setTimeout(() => {
    if (_currentlyPlaying?.el === cardEl) {
      stopPlaying();
    }
  }, 2000);
}

function stopPlaying() {
  if (_currentlyPlaying) {
    _currentlyPlaying.el.style.transform = '';
    _currentlyPlaying.el.style.boxShadow = '';
    _currentlyPlaying = null;
  }
  window.dispatchEvent(new CustomEvent('stop-audio'));
}

async function playAllStrings() {
  for (const s of STRINGS) {
    const card = document.getElementById(`string-${s.name}`);
    if (card) {
      playStringReference(s, card);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
