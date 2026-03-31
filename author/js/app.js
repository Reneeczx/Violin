import * as AuthorView from './ui/author-view.js';

function init() {
  const container = document.getElementById('author-main');
  AuthorView.init(container);
  AuthorView.show();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
