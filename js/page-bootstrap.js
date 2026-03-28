(function (global) {
  function needsLocalServer(locationLike) {
    return Boolean(locationLike) && locationLike.protocol === 'file:';
  }

  function buildWarningMarkup(options) {
    return [
      '<section class="card boot-warning" role="status">',
      '  <div class="boot-warning__eyebrow">Local Preview Needed</div>',
      `  <h2 class="boot-warning__title">${escapeHtml(options.pageName)} 不能直接双击打开</h2>`,
      '  <p class="boot-warning__copy">',
      '    你现在是从本地磁盘直接打开这个页面，浏览器不会正常启动项目里的模块脚本，所以只会看到静态外壳。',
      '  </p>',
      '  <div class="boot-warning__steps">',
      '    <div class="boot-warning__step">',
      '      <strong>1. 在项目目录启动本地服务器</strong>',
      `      <code>${escapeHtml(options.command)}</code>`,
      '    </div>',
      '    <div class="boot-warning__step">',
      '      <strong>2. 用浏览器访问这个地址</strong>',
      `      <code>${escapeHtml(options.previewUrl)}</code>`,
      '    </div>',
      '  </div>',
      '  <p class="boot-warning__note">',
      '    如果你已经启动过服务器，直接把地址栏改成上面的 `http://127.0.0.1:8124/...` 即可。',
      '  </p>',
      '</section>',
    ].join('');
  }

  function start(options, env) {
    var runtime = env || global;
    var doc = runtime.document;
    var container = doc.getElementById(options.containerId);
    if (!container) {
      return { mode: 'missing-container' };
    }

    if (needsLocalServer(runtime.location)) {
      container.innerHTML = buildWarningMarkup(options);
      container.classList.add('boot-warning-host');
      return { mode: 'warning' };
    }

    var script = doc.createElement('script');
    script.type = 'module';
    script.src = options.moduleSrc;
    doc.body.appendChild(script);
    return { mode: 'module' };
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  global.PageBootstrap = {
    needsLocalServer: needsLocalServer,
    buildWarningMarkup: buildWarningMarkup,
    start: start,
  };
})(window);
