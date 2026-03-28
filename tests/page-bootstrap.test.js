import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'js/page-bootstrap.js'), 'utf8');

function loadBootstrap() {
  const sandbox = {
    window: {},
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(source, sandbox);
  return sandbox.window.PageBootstrap;
}

test('needsLocalServer detects direct file opening', () => {
  const bootstrap = loadBootstrap();

  assert.equal(bootstrap.needsLocalServer({ protocol: 'file:' }), true);
  assert.equal(bootstrap.needsLocalServer({ protocol: 'http:' }), false);
});

test('buildWarningMarkup includes the exact local preview instructions', () => {
  const bootstrap = loadBootstrap();
  const markup = bootstrap.buildWarningMarkup({
    pageName: '学习页',
    command: 'py -m http.server 8124 --bind 127.0.0.1',
    previewUrl: 'http://127.0.0.1:8124/learning.html',
  });

  assert.match(markup, /学习页 不能直接双击打开/);
  assert.match(markup, /py -m http\.server 8124 --bind 127\.0\.0\.1/);
  assert.match(markup, /http:\/\/127\.0\.0\.1:8124\/learning\.html/);
});

test('start renders a warning instead of loading the module on file protocol', () => {
  const bootstrap = loadBootstrap();
  const container = {
    innerHTML: '',
    classList: {
      added: [],
      add(name) {
        this.added.push(name);
      },
    },
  };
  const env = {
    location: { protocol: 'file:' },
    document: {
      body: {
        appended: [],
        appendChild(node) {
          this.appended.push(node);
        },
      },
      getElementById(id) {
        return id === 'learning-main' ? container : null;
      },
      createElement() {
        throw new Error('module script should not be created for file protocol');
      },
    },
  };

  const result = bootstrap.start({
    containerId: 'learning-main',
    moduleSrc: 'js/learning-app.js?v=20260328',
    pageName: '学习页',
    command: 'py -m http.server 8124 --bind 127.0.0.1',
    previewUrl: 'http://127.0.0.1:8124/learning.html',
  }, env);

  assert.equal(result.mode, 'warning');
  assert.match(container.innerHTML, /学习页 不能直接双击打开/);
  assert.deepEqual(container.classList.added, ['boot-warning-host']);
  assert.equal(env.document.body.appended.length, 0);
});

test('start injects the module entry on http protocol', () => {
  const bootstrap = loadBootstrap();
  const appended = [];
  const env = {
    location: { protocol: 'http:' },
    document: {
      body: {
        appendChild(node) {
          appended.push(node);
        },
      },
      getElementById(id) {
        return id === 'main' ? { classList: { add() {} } } : null;
      },
      createElement(tagName) {
        return { tagName };
      },
    },
  };

  const result = bootstrap.start({
    containerId: 'main',
    moduleSrc: 'js/app.js?v=20260328',
    pageName: '练习应用',
    command: 'py -m http.server 8124 --bind 127.0.0.1',
    previewUrl: 'http://127.0.0.1:8124/index.html',
  }, env);

  assert.equal(result.mode, 'module');
  assert.equal(appended.length, 1);
  assert.equal(appended[0].tagName, 'script');
  assert.equal(appended[0].type, 'module');
  assert.equal(appended[0].src, 'js/app.js?v=20260328');
});
