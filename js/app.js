import Router from './router.js';
import { renderNav, updateNavActive } from './ui/nav.js';
import * as HomeView from './ui/home-view.js';
import * as PlanView from './ui/plan-view.js';
import * as TunerView from './ui/tuner-view.js';
import * as ProgressView from './ui/progress-view.js';
import Recorder from './recorder.js';

const router = new Router();

function init() {
  // Init nav
  const nav = document.getElementById('nav');
  renderNav(nav);

  // Create view containers
  const main = document.getElementById('main');
  const views = {};
  ['home', 'plan', 'tuner', 'progress'].forEach(name => {
    const div = document.createElement('div');
    div.id = `view-${name}`;
    div.className = 'view';
    main.appendChild(div);
    views[name] = div;
  });

  // Init views
  HomeView.init(views.home);
  PlanView.init(views.plan);
  TunerView.init(views.tuner);
  ProgressView.init(views.progress);

  // Register routes
  const routeMap = {
    '/':         { view: 'home', module: HomeView, navRoute: '/' },
    '/plan':     { view: 'plan', module: PlanView, navRoute: '/plan' },
    '/tuner':    { view: 'tuner', module: TunerView, navRoute: '/tuner' },
    '/progress': { view: 'progress', module: ProgressView, navRoute: '/progress' },
  };

  Object.entries(routeMap).forEach(([pattern, config]) => {
    router.register(pattern, {
      show(params) {
        // Hide all views
        Object.values(views).forEach(v => v.classList.remove('active'));
        // Show target view
        views[config.view].classList.add('active');
        config.module.show(params);
        updateNavActive(config.navRoute);
        // Update header
        const titles = { home: '今日练习', plan: '本周计划', tuner: '调弦助手', progress: '我的进度' };
        document.getElementById('header-title').textContent = titles[config.view] || '';
      },
      hide() {
        config.module.hide?.();
      }
    });
  });

  router.start();

  // Cleanup old recordings on startup
  const lesson = window.CURRENT_LESSON;
  if (lesson?.weekOf) {
    Recorder.cleanupOldRecordings(lesson.weekOf);
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration skipped:', err.message);
    });
  }
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
