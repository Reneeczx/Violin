import { createCard, createElement } from './components.js';
import { THEORY_TOPICS, getTheoryTopic } from '../music-theory.js';

let _container = null;

export function init(container) {
  _container = container;
}

export function show(params = {}) {
  const topic = getTheoryTopic(params.topic);
  _container.innerHTML = '';

  const header = createElement('div', '', `
    <div style="text-align:center; margin-bottom: var(--space-lg);">
      <h2 style="margin-bottom: var(--space-sm);">基础乐理</h2>
      <div style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">
        把练习里最常见的速度、术语、休止和空弦概念讲清楚。
      </div>
    </div>
  `);
  _container.appendChild(header);

  const backBtn = createElement('button', 'btn btn--ghost', '← 返回今日练习');
  backBtn.style.marginBottom = 'var(--space-md)';
  backBtn.addEventListener('click', () => {
    location.hash = '#/';
  });
  _container.appendChild(backBtn);

  _container.appendChild(renderTopicCard(topic));

  const relatedTitle = createElement('div', '', '继续看这些主题');
  relatedTitle.style.margin = 'var(--space-lg) 0 var(--space-sm)';
  relatedTitle.style.fontSize = 'var(--font-size-sm)';
  relatedTitle.style.color = 'var(--color-text-secondary)';
  _container.appendChild(relatedTitle);

  const relatedGrid = createElement('div', 'controls', '');
  THEORY_TOPICS.filter((item) => item.id !== topic.id).forEach((item) => {
    const button = createElement('button', 'btn btn--secondary', item.title);
    button.addEventListener('click', () => {
      location.hash = `#/theory/${item.id}`;
    });
    relatedGrid.appendChild(button);
  });
  _container.appendChild(relatedGrid);
}

export function hide() {}

function renderTopicCard(topic) {
  const card = createCard({
    title: `📘 ${topic.title}`,
    subtitle: topic.summary,
  });

  const bullets = createElement('ul', '');
  bullets.style.marginTop = 'var(--space-md)';
  bullets.style.paddingLeft = 'var(--space-lg)';
  bullets.style.listStyle = 'disc';

  topic.bullets.forEach((bullet) => {
    const item = createElement('li', '', bullet);
    item.style.marginBottom = 'var(--space-sm)';
    bullets.appendChild(item);
  });
  card.appendChild(bullets);

  const examplesTitle = createElement('div', '', '例子');
  examplesTitle.style.marginTop = 'var(--space-md)';
  examplesTitle.style.fontWeight = 'var(--font-weight-bold)';
  card.appendChild(examplesTitle);

  topic.examples.forEach((example) => {
    const exampleEl = createElement('div', 'tip', `
      <span class="tip__icon">🎻</span>
      <span>${example}</span>
    `);
    exampleEl.style.marginTop = 'var(--space-sm)';
    card.appendChild(exampleEl);
  });

  return card;
}
