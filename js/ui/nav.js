const TABS = [
  { id: '/', icon: '🎵', label: '今日' },
  { id: '/plan', icon: '🗓️', label: '本周' },
  { id: '/tuner', icon: '🎻', label: '调弦' },
  { id: '/progress', icon: '⭐', label: '进度' },
];

export function renderNav(container) {
  container.innerHTML = TABS.map((tab) => `
    <button class="nav__item" data-route="${tab.id}">
      <span class="nav__icon">${tab.icon}</span>
      <span class="nav__label">${tab.label}</span>
    </button>
  `).join('');

  container.addEventListener('click', (event) => {
    const item = event.target.closest('.nav__item');
    if (item) {
      location.hash = `#${item.dataset.route}`;
    }
  });
}

export function updateNavActive(route) {
  document.querySelectorAll('.nav__item').forEach((item) => {
    item.classList.toggle('active', item.dataset.route === route);
  });
}
