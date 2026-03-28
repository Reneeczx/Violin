import * as LearnView from './ui/learn-view.js';

function init() {
  const container = document.getElementById('learning-main');
  LearnView.init(container);
  LearnView.show();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
