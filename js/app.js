import Router from './router.js';
import { renderNav, updateNavActive } from './ui/nav.js';
import * as HomeView from './ui/home-view.js';
import * as PlanView from './ui/plan-view.js';
import * as TunerView from './ui/tuner-view.js';
import * as ProgressView from './ui/progress-view.js';
import * as TheoryView from './ui/theory-view.js';
import Recorder from './recorder.js';

const router = new Router();

function init() {
  const nav = document.getElementById('nav');
  renderNav(nav);

  const main = document.getElementById('main');
  const views = {};
  ['home', 'plan', 'tuner', 'progress', 'theory'].forEach((name) => {
    const div = document.createElement('div');
    div.id = `view-${name}`;
    div.className = 'view';
    main.appendChild(div);
    views[name] = div;
  });

  HomeView.init(views.home);
  PlanView.init(views.plan);
  TunerView.init(views.tuner);
  ProgressView.init(views.progress);
  TheoryView.init(views.theory);

  const routeMap = {
    '/': { view: 'home', module: HomeView, navRoute: '/' },
    '/plan': { view: 'plan', module: PlanView, navRoute: '/plan' },
    '/tuner': { view: 'tuner', module: TunerView, navRoute: '/tuner' },
    '/progress': { view: 'progress', module: ProgressView, navRoute: '/progress' },
    '/theory': { view: 'theory', module: TheoryView, navRoute: '/' },
    '/theory/:topic': { view: 'theory', module: TheoryView, navRoute: '/' },
  };

  Object.entries(routeMap).forEach(([pattern, config]) => {
    router.register(pattern, {
      show(params) {
        Object.values(views).forEach((view) => view.classList.remove('active'));
        views[config.view].classList.add('active');
        config.module.show(params);
        updateNavActive(config.navRoute);

        const titles = {
          home: '今日练习',
          plan: '本周计划',
          tuner: '调弦助手',
          progress: '我的进度',
          theory: '基础乐理',
        };
        document.getElementById('header-title').textContent = titles[config.view] || '';
      },
      hide() {
        config.module.hide?.();
      },
    });
  });

  router.start();

  const lesson = window.CURRENT_LESSON;
  if (lesson?.weekOf) {
    Recorder.cleanupOldRecordings(lesson.weekOf);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.log('SW registration skipped:', error.message);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
