import { createCard, createElement, createTip } from '../../../js/ui/components.js';
import { generateDailyPlan } from '../../../js/practice-plan.js';
import {
  getAllWeekPackages,
  getCurrentWeekOf,
  getDayNumberForWeek,
  getWeekPackage,
  importWeekPackage,
  publishWeekPackage,
  saveDraftShell,
} from '../../../js/week-package-store.js';
import { buildCodexPrompt, buildWeekManifest, validateWeekPackage } from '../../../js/week-package-utils.js';
import { getAssetBlob, replaceWeekAssets } from '../../../js/source-asset-store.js';

let _container = null;
let _selectedWeekOf = null;
let _flashMessage = null;
let _importText = '';

const DAY_OPTIONS = [
  { value: 1, label: 'Day 1 / 周一' },
  { value: 2, label: 'Day 2 / 周二' },
  { value: 3, label: 'Day 3 / 周三' },
  { value: 4, label: 'Day 4 / 周四' },
  { value: 5, label: 'Day 5 / 周五' },
  { value: 6, label: 'Day 6 / 周六' },
  { value: 7, label: 'Day 7 / 周日' },
];

export function init(container) {
  _container = container;
}

export function show() {
  const allPackages = getAllWeekPackages();
  _selectedWeekOf = _selectedWeekOf || allPackages[0]?.weekOf || getCurrentWeekOf();
  render();
}

function render() {
  const allPackages = getAllWeekPackages();
  const currentPackage = getWeekPackage(_selectedWeekOf) || buildDraftDefaults(_selectedWeekOf);

  _container.innerHTML = '';
  const stack = createElement('div', 'author-stack', '');
  _container.appendChild(stack);

  if (_flashMessage) {
    stack.appendChild(createFlashTip(_flashMessage));
  }

  stack.appendChild(renderToolbar(currentPackage));

  const grid = createElement('section', 'author-grid', '');
  grid.appendChild(renderMainColumn(currentPackage));
  grid.appendChild(renderSidebar(currentPackage, allPackages));
  stack.appendChild(grid);
}

function renderToolbar(currentPackage) {
  const card = createCard({
    title: '作者流程',
    subtitle: '先保存草案，再导出给 Codex，最后导入 JSON 预览并发布。',
  });

  const body = createElement('div', 'author-card__body', '');
  body.appendChild(createTip('v1 的生成通道固定为外部 Codex IDE。页面内不配置 API Key，也不尝试直接联动本地插件。', '🧭'));

  const actions = createElement('div', 'author-actions', '');

  const reviewButton = createElement('button', 'btn btn--secondary', '本周没上课，生成复习周');
  reviewButton.type = 'button';
  reviewButton.addEventListener('click', async () => {
    const weekOf = getCurrentWeekOf();
    const existing = getWeekPackage(weekOf);
    if (existing?.status === 'published') {
      setFlash('info', '本周已经有已发布周包；如需改动，请先新建下一周或导入新的草案。');
      render();
      return;
    }

    saveDraftShell({
      weekOf,
      planKind: 'review',
      publishedFromDayNumber: getSuggestedStartDay(weekOf),
      teacherBrief: existing?.teacherBrief || '本周无新课，生成一周低压力复习计划。',
      sourceAssets: existing?.sourceAssets || [],
    });
    _selectedWeekOf = weekOf;
    setFlash('success', '已创建复习周草案。现在可以导出给 Codex。');
    render();
  });
  actions.appendChild(reviewButton);

  const publishButton = createElement(
    'button',
    'btn btn--primary',
    currentPackage.status === 'published' ? '已发布' : '发布当前周包',
  );
  publishButton.type = 'button';
  publishButton.disabled = currentPackage.status === 'published';
  publishButton.addEventListener('click', () => handlePublish(currentPackage.weekOf));
  actions.appendChild(publishButton);

  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

function renderMainColumn(currentPackage) {
  const column = createElement('div', 'author-stack', '');
  column.appendChild(renderDraftShellCard(currentPackage));
  column.appendChild(renderInsightsCard(currentPackage));
  column.appendChild(renderImportCard(currentPackage));
  column.appendChild(renderPreviewCard(currentPackage));
  return column;
}

function renderDraftShellCard(currentPackage) {
  const card = createCard({
    title: '1. 草案壳',
    subtitle: '确定周次、模式、老师要求和原始乐谱。',
    badge: formatStatusLabel(currentPackage),
  });

  const body = createElement('div', 'author-card__body', '');
  body.innerHTML = `
    <div class="author-badge-row">
      <span class="author-chip">weekOf: ${escapeHtml(currentPackage.weekOf)}</span>
      <span class="author-chip">mode: ${escapeHtml(currentPackage.planKind)}</span>
      <span class="author-chip">state: ${escapeHtml(currentPackage.authoringState || 'draft-shell')}</span>
    </div>
    <form class="author-form-grid" id="draft-shell-form">
      <label class="author-field">
        <span class="author-label">周一日期</span>
        <input class="author-input" type="date" name="weekOf" value="${escapeHtml(currentPackage.weekOf)}">
      </label>
      <label class="author-field">
        <span class="author-label">计划类型</span>
        <select class="author-select" name="planKind">
          <option value="lesson"${currentPackage.planKind === 'lesson' ? ' selected' : ''}>正常上课周</option>
          <option value="review"${currentPackage.planKind === 'review' ? ' selected' : ''}>复习周</option>
        </select>
      </label>
      <label class="author-field">
        <span class="author-label">从第几天开始生效</span>
        <select class="author-select" name="publishedFromDayNumber">
          ${DAY_OPTIONS.map((option) => `
            <option value="${option.value}"${Number(currentPackage.publishedFromDayNumber) === option.value ? ' selected' : ''}>${option.label}</option>
          `).join('')}
        </select>
      </label>
      <label class="author-field">
        <span class="author-label">原始乐谱</span>
        <input class="author-input" type="file" name="sourceFiles" accept="application/pdf,image/*" multiple>
      </label>
      <label class="author-field author-field--full">
        <span class="author-label">老师总体要求</span>
        <textarea class="author-textarea" name="teacherBrief" placeholder="输入老师这周的核心要求、节奏提示、重点纠正项。">${escapeHtml(currentPackage.teacherBrief || '')}</textarea>
      </label>
    </form>
  `;

  body.appendChild(createElement('p', 'author-help', currentPackage.planKind === 'review'
    ? '复习周允许没有新原谱；导出的 manifest 会自动带上最近已发布周和完成摘要。'
    : '正常上课周建议至少上传一份 PDF 或图片原谱，再导出给 Codex。'));

  if (currentPackage.status === 'published') {
    body.appendChild(createTip('已发布周包现在是只读的。若要继续编辑，请先把“周一日期”改成新的 weekOf，再保存成新草案。', '🔒'));
  }

  if (currentPackage.sourceAssets?.length) {
    body.appendChild(renderAssets(currentPackage.sourceAssets));
  }

  const actions = createElement('div', 'author-actions', '');

  const saveButton = createElement('button', 'btn btn--primary', '保存草案壳');
  saveButton.type = 'button';
  saveButton.addEventListener('click', () => handleSaveDraft(currentPackage));
  actions.appendChild(saveButton);

  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

function renderInsightsCard(currentPackage) {
  const manifest = buildWeekManifest(currentPackage);
  const card = createCard({
    title: '2. 自动学习画像与建议',
    subtitle: '系统根据最近学习周、完成情况和已有内容，先给出一个轻量学习画像，再产出本周建议关注点；这里的最终关注点会直接进入导出的 manifest 和 prompt。',
  });

  const body = createElement('div', 'author-card__body', '');
  body.appendChild(createElement('div', 'author-badge-row', `
    <span class="author-chip">阶段: ${escapeHtml(manifest.learningProfile.stageLabel)}</span>
    <span class="author-chip">参考周数: ${escapeHtml(String(manifest.learningProfile.learnedWeekCount))}</span>
    <span class="author-chip">稳定度: ${escapeHtml(manifest.learningProfile.consistencyLabel)}</span>
    <span class="author-chip">日练习: ${escapeHtml(String(manifest.learningProfile.observedAverageMinutes))} 分钟</span>
  `));
  body.appendChild(createElement('p', 'author-help', manifest.learningProfile.summary));
  body.appendChild(renderInsightBlock('当前内容覆盖', manifest.learningProfile.currentCoverage));
  body.appendChild(renderInsightBlock('当前主要风险点', manifest.learningProfile.currentChallenges));
  body.appendChild(renderInsightBlock('判断依据', manifest.learningProfile.evidence));
  body.appendChild(renderCoachingFocusBlock(manifest.suggestedCoachingFocus));

  const field = createElement('label', 'author-field', '');
  field.innerHTML = `
    <span class="author-label">导出给 Codex 的最终关注点（可改写，每行一条）</span>
    <textarea
      class="author-textarea author-textarea--compact"
      id="manual-coaching-focus"
      placeholder="留空则沿用系统建议；也可以删改成你最想保留的 2-4 条。"
    >${escapeHtml(getEditableCoachingFocusText(currentPackage, manifest))}</textarea>
  `;
  body.appendChild(field);
  body.appendChild(createElement(
    'p',
    'author-help',
    '系统建议只负责给方向，不是老师诊断。你可以删除、改写或压缩成更适合这周家庭练习的 2 到 4 条重点。',
  ));

  body.appendChild(createElement('section', 'author-export-sequence', `
    <div class="author-export-sequence__title">推荐导出顺序</div>
    <div class="author-export-sequence__steps">
      <div class="author-export-sequence__step">
        <div class="author-export-sequence__badge">1</div>
        <div class="author-export-sequence__body">
          <div class="author-export-sequence__label">先下载 <code>week-manifest.json</code></div>
          <div class="author-export-sequence__detail">先确认学习画像、最终关注点、历史上下文这些结构化内容都对。</div>
        </div>
      </div>
      <div class="author-export-sequence__step">
        <div class="author-export-sequence__badge">2</div>
        <div class="author-export-sequence__body">
          <div class="author-export-sequence__label">再下载 <code>codex-prompt.md</code></div>
          <div class="author-export-sequence__detail">这份 prompt 会直接带上刚确认的 manifest 信息，适合一起交给 Codex。</div>
        </div>
      </div>
    </div>
  `));

  const actions = createElement('div', 'author-actions', '');

  const manifestButton = createElement('button', 'btn btn--primary', '1. 保存并下载 week-manifest.json');
  manifestButton.type = 'button';
  manifestButton.addEventListener('click', async () => {
    await handleDownloadManifest(currentPackage);
  });
  actions.appendChild(manifestButton);

  const promptButton = createElement('button', 'btn btn--secondary', '2. 保存并下载 codex-prompt.md');
  promptButton.type = 'button';
  promptButton.addEventListener('click', async () => {
    await handleDownloadPrompt(currentPackage);
  });
  actions.appendChild(promptButton);

  body.appendChild(createElement(
    'p',
    'author-help',
    '点击下载前，页面会先自动保存周次、老师要求、原谱附件以及你刚改的“最终关注点”。',
  ));
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}

function renderAssets(sourceAssets) {
  const host = createElement('div', 'author-assets', '');
  sourceAssets.forEach((asset) => {
    const row = createElement('div', 'author-asset', '');
    row.innerHTML = `
      <div class="author-asset__meta">
        <div class="author-asset__name">${escapeHtml(asset.name)}</div>
        <div class="author-asset__detail">${escapeHtml(asset.type || 'unknown')} · ${formatFileSize(asset.size)}</div>
      </div>
    `;

    const downloadButton = createElement('button', 'btn btn--ghost', '下载原谱附件');
    downloadButton.type = 'button';
    downloadButton.addEventListener('click', () => downloadAsset(asset));
    row.appendChild(downloadButton);
    host.appendChild(row);
  });
  return host;
}

function renderImportCard(currentPackage) {
  const card = createCard({
    title: '3. 导入 Codex 结果',
    subtitle: '只接受结构化 week-package.json，不接受纯自然语言草案。',
  });

  const body = createElement('div', 'author-card__body', '');
  body.innerHTML = `
    <div class="author-textarea-block">
      <label class="author-field">
        <span class="author-label">导入 JSON 文件</span>
        <input class="author-input" type="file" id="week-package-file" accept="application/json,.json">
      </label>
      <label class="author-field">
        <span class="author-label">或粘贴 JSON</span>
        <textarea class="author-textarea" id="week-package-text" placeholder='粘贴 week-package.json'>${escapeHtml(_importText)}</textarea>
      </label>
    </div>
  `;

  body.appendChild(createTip(`当前目标 weekOf: ${currentPackage.weekOf}`, '📦'));

  const actions = createElement('div', 'author-actions', '');
  const importButton = createElement('button', 'btn btn--primary', '导入 week-package.json');
  importButton.type = 'button';
  importButton.addEventListener('click', () => handleImport(currentPackage.weekOf));
  actions.appendChild(importButton);

  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

function renderPreviewCard(currentPackage) {
  const card = createCard({
    title: '4. 预览与发布',
    subtitle: currentPackage.generatedLesson
      ? '这是主练习应用会消费的结构化结果。'
      : '导入有效 JSON 后，这里会出现完整周预览。',
  });

  const body = createElement('div', 'author-card__body', '');
  const errors = currentPackage.generatedLesson ? validateWeekPackage(currentPackage) : [];
  if (!currentPackage.generatedLesson) {
    body.appendChild(createTip('还没有导入结构化周包。先在 Codex 里生成 week-package.json，再回来导入。', '🧪'));
    card.appendChild(body);
    return card;
  }

  body.appendChild(createTip(
    errors.length
      ? `当前 JSON 还不能发布：${errors[0]}`
      : '结构化周包通过基础校验，可以继续发布。',
    errors.length ? '⚠️' : '✅',
  ));

  if (errors.length) {
    const errorList = createElement('div', 'author-preview-day author-preview-day--inactive', `
      <div class="author-preview-day__title">校验问题</div>
      <div class="author-preview-day__list">
        ${errors.map((error) => `<div class="author-preview-day__item">${escapeHtml(error)}</div>`).join('')}
      </div>
    `);
    body.appendChild(errorList);
  }

  const summary = createElement('div', 'author-badge-row', `
    <span class="author-chip">title: ${escapeHtml(currentPackage.generatedLesson.title)}</span>
    <span class="author-chip">provider: ${escapeHtml(currentPackage.generationProvider)}</span>
    <span class="author-chip">start: Day ${escapeHtml(String(currentPackage.publishedFromDayNumber))}</span>
    <span class="author-chip">status: ${escapeHtml(currentPackage.status)}</span>
  `);
  body.appendChild(summary);
  body.appendChild(renderPreviewDays(currentPackage.generatedLesson));

  if (!errors.length && currentPackage.status !== 'published') {
    const publishButton = createElement('button', 'btn btn--primary', '发布到主应用');
    publishButton.type = 'button';
    publishButton.addEventListener('click', () => handlePublish(currentPackage.weekOf));
    body.appendChild(publishButton);
  }

  card.appendChild(body);
  return card;
}

function renderPreviewDays(lesson) {
  const host = createElement('div', 'author-preview-days', '');
  for (let dayNumber = 1; dayNumber <= 7; dayNumber += 1) {
    const plan = generateDailyPlan(lesson, dayNumber);
    const classes = ['author-preview-day'];
    if (plan.dayStatus === 'inactive') {
      classes.push('author-preview-day--inactive');
    }

    const card = createElement('section', classes.join(' '), `
      <div class="author-preview-day__header">
        <div class="author-preview-day__title">Day ${dayNumber}</div>
        <div class="author-preview-day__badge">${escapeHtml(formatDayStatus(plan))}</div>
      </div>
      <div class="author-preview-day__item">${escapeHtml(plan.theme || '未设置主题')}</div>
    `);

    const list = createElement('div', 'author-preview-day__list', '');
    if (!plan.sections.length) {
      list.appendChild(createElement('div', 'author-preview-day__item', '计划发布前，不生成任务。'));
    } else {
      plan.sections.forEach((section) => {
        list.appendChild(createElement(
          'div',
          'author-preview-day__item',
          `${escapeHtml(section.title)}${section.focus ? ` · ${escapeHtml(section.focus)}` : ''}`,
        ));
      });
    }
    card.appendChild(list);
    host.appendChild(card);
  }
  return host;
}

function renderSidebar(currentPackage, allPackages) {
  const column = createElement('div', 'author-stack', '');

  const statusCard = createCard({
    title: '当前选中周',
    subtitle: currentPackage.weekOf,
    badge: formatStatusLabel(currentPackage),
  });
  const statusBody = createElement('div', 'author-card__body', '');
  statusBody.appendChild(createTip(
    currentPackage.status === 'published'
      ? '这周已经发布，主应用会优先读取它。'
      : '这周还处于草案态，不会进入学生端历史列表。',
    currentPackage.status === 'published' ? '📘' : '📝',
  ));
  statusBody.appendChild(createElement('div', 'author-badge-row', `
    <span class="author-chip">assets: ${escapeHtml(String(currentPackage.sourceAssets?.length || 0))}</span>
    <span class="author-chip">plan: ${escapeHtml(currentPackage.planKind)}</span>
    <span class="author-chip">provider: ${escapeHtml(currentPackage.generationProvider || 'pending')}</span>
  `));
  statusCard.appendChild(statusBody);
  column.appendChild(statusCard);

  const listCard = createCard({
    title: '本机周包目录',
    subtitle: '只要发布成功，就会出现在主应用历史里。',
    badge: `${allPackages.length}`,
  });

  const list = createElement('div', 'author-package-list', '');
  if (!allPackages.length) {
    list.appendChild(createTip('还没有周包。先保存一份草案壳。', '📭'));
  } else {
    allPackages.forEach((weekPackage) => {
      const button = createElement(
        'button',
        `author-package-item${weekPackage.weekOf === currentPackage.weekOf ? ' author-package-item--active' : ''}`,
        `
          <div class="author-package-item__row">
            <div class="author-package-item__title">${escapeHtml(weekPackage.weekOf)} · ${escapeHtml(weekPackage.generatedLesson?.title || '(draft shell)')}</div>
            <span class="author-package-item__status author-package-item__status--${escapeHtml(weekPackage.authoringState || 'draft-shell')}">${escapeHtml(formatStatusLabel(weekPackage))}</span>
          </div>
          <div class="author-package-item__detail">
            ${escapeHtml(weekPackage.planKind)} · start day ${escapeHtml(String(weekPackage.publishedFromDayNumber || 1))}
          </div>
        `,
      );
      button.type = 'button';
      button.addEventListener('click', () => {
        _selectedWeekOf = weekPackage.weekOf;
        render();
      });
      list.appendChild(button);
    });
  }

  listCard.appendChild(list);
  column.appendChild(listCard);
  return column;
}

async function handleSaveDraft(currentPackage) {
  try {
    return await persistDraft(currentPackage, {
      flashType: 'success',
      flashMessage: '草案壳已保存。现在可以导出给 Codex。',
      renderAfter: true,
    });
  } catch (error) {
    setFlash('error', error.message);
    render();
    return currentPackage;
  }
}

async function persistDraft(currentPackage, options = {}) {
  const form = document.getElementById('draft-shell-form');
  const weekOf = form.elements.weekOf.value || getCurrentWeekOf();
  const planKind = form.elements.planKind.value || 'lesson';
  const publishedFromDayNumber = Number(form.elements.publishedFromDayNumber.value || 1);
  const teacherBrief = form.elements.teacherBrief.value.trim();
  const manualCoachingFocus = parseLineList(document.getElementById('manual-coaching-focus')?.value || '');
  const fileInput = form.elements.sourceFiles;
  const sameWeek = weekOf === currentPackage.weekOf;

  if (sameWeek && currentPackage.status === 'published') {
    throw new Error('已发布周包为只读。请先改成新的周一日期，再另存为新草案。');
  }

  let sourceAssets = sameWeek ? (currentPackage.sourceAssets || []) : [];
  if (fileInput.files?.length) {
    sourceAssets = await replaceWeekAssets(
      weekOf,
      fileInput.files,
      sameWeek ? (currentPackage.sourceAssets || []).map((asset) => asset.id) : [],
    );
  }

  saveDraftShell({
    weekOf,
    planKind,
    publishedFromDayNumber,
    teacherBrief,
    sourceAssets,
    manualCoachingFocus,
  });
  _selectedWeekOf = weekOf;
  if (options.flashMessage) {
    setFlash(options.flashType || 'success', options.flashMessage);
  }
  if (options.renderAfter) {
    render();
  }

  return getWeekPackage(weekOf) || buildDraftDefaults(weekOf);
}

async function handleDownloadManifest(currentPackage) {
  let savedPackage;
  try {
    savedPackage = await persistDraft(currentPackage, {
      flashType: 'success',
      flashMessage: 'week-manifest.json 已按当前设置重新生成并下载。',
      renderAfter: false,
    });
  } catch (error) {
    setFlash('error', error.message);
    render();
    return;
  }

  const nextPackage = getWeekPackage(savedPackage.weekOf) || savedPackage;
  if (!nextPackage) {
    setFlash('error', '请先保存一份草案壳，再下载 manifest。');
    render();
    return;
  }

  const manifest = buildWeekManifest(nextPackage);
  downloadText('week-manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  render();
}

async function handleDownloadPrompt(currentPackage) {
  let savedPackage;
  try {
    savedPackage = await persistDraft(currentPackage, {
      flashType: 'success',
      flashMessage: 'codex-prompt.md 已按当前设置重新生成并下载。',
      renderAfter: false,
    });
  } catch (error) {
    setFlash('error', error.message);
    render();
    return;
  }

  const nextPackage = getWeekPackage(savedPackage.weekOf) || savedPackage;
  if (!nextPackage) {
    setFlash('error', '请先保存一份草案壳，再下载 prompt。');
    render();
    return;
  }

  const manifest = buildWeekManifest(nextPackage);
  downloadText('codex-prompt.md', buildCodexPrompt(manifest), 'text/markdown');
  render();
}

async function handleImport(expectedWeekOf) {
  const fileInput = document.getElementById('week-package-file');
  const textarea = document.getElementById('week-package-text');
  _importText = textarea.value;

  const raw = fileInput.files?.length
    ? await fileInput.files[0].text()
    : textarea.value.trim();

  if (!raw) {
    setFlash('error', '请选择 JSON 文件或粘贴 week-package.json。');
    render();
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    setFlash('error', `JSON 解析失败：${error.message}`);
    render();
    return;
  }

  const errors = validateWeekPackage(parsed);
  if (errors.length) {
    setFlash('error', `导入失败：${errors[0]}`);
    render();
    return;
  }

  if (expectedWeekOf && parsed.weekOf !== expectedWeekOf) {
    setFlash('info', `已切换到 JSON 自带的 weekOf：${parsed.weekOf}`);
  } else {
    setFlash('success', 'JSON 已导入。请先预览，再决定是否发布。');
  }

  try {
    importWeekPackage(parsed);
    _selectedWeekOf = parsed.weekOf;
    _importText = '';
    render();
  } catch (error) {
    setFlash('error', error.message);
    render();
  }
}

function handlePublish(weekOf) {
  const currentPackage = getWeekPackage(weekOf);
  if (!currentPackage) {
    setFlash('error', '没有找到当前草案，无法发布。');
    render();
    return;
  }

  if (!currentPackage?.generatedLesson) {
    setFlash('error', '没有结构化周包，无法发布。');
    render();
    return;
  }

  const errors = validateWeekPackage(currentPackage);
  if (errors.length) {
    setFlash('error', `当前 JSON 还不能发布：${errors[0]}`);
    render();
    return;
  }

  publishWeekPackage(weekOf);
  setFlash('success', '周包已发布。主应用会优先读取这周的已发布版本。');
  render();
}

async function downloadAsset(asset) {
  const blob = await getAssetBlob(asset.id);
  if (!blob) {
    setFlash('error', '本机没有找到这份原谱附件，请重新上传。');
    render();
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = asset.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildDraftDefaults(weekOf) {
  return {
    weekOf,
    status: 'draft',
    planKind: 'lesson',
    authoringState: 'draft-shell',
    publishedFromDayNumber: getSuggestedStartDay(weekOf),
    teacherBrief: '',
    manualCoachingFocus: [],
    sourceAssets: [],
    generationProvider: 'external_codex_manual',
    generatedLesson: null,
  };
}

function createFlashTip(flash) {
  const icon = flash.type === 'error'
    ? '⚠️'
    : flash.type === 'success'
      ? '✅'
      : 'ℹ️';
  return createTip(flash.message, icon);
}

function setFlash(type, message) {
  _flashMessage = { type, message };
}

function getSuggestedStartDay(weekOf) {
  return getDayNumberForWeek(weekOf) || 1;
}

function formatStatusLabel(weekPackage) {
  if (weekPackage.status === 'published') {
    return 'published';
  }

  return weekPackage.authoringState || 'draft-shell';
}

function formatDayStatus(plan) {
  if (plan.dayStatus === 'inactive') {
    return '计划发布前';
  }
  if (plan.dayStatus === 'catchup') {
    return `catchup · ${plan.totalMinutes} 分钟`;
  }
  return `planned · ${plan.totalMinutes} 分钟`;
}

function downloadText(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatFileSize(size = 0) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`;
  }
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function renderInsightBlock(title, items) {
  const section = createElement('section', 'author-insight-block', '');
  section.innerHTML = `
    <div class="author-insight-block__title">${escapeHtml(title)}</div>
    <div class="author-insight-list">
      ${items.map((item) => `<div class="author-insight-list__item">${escapeHtml(item)}</div>`).join('')}
    </div>
  `;
  return section;
}

function renderCoachingFocusBlock(items) {
  const section = createElement('section', 'author-insight-block', '');
  section.innerHTML = `
    <div class="author-insight-block__title">系统建议关注点</div>
    <div class="author-focus-list">
      ${items.map((item) => `
        <article class="author-focus-item">
          <div class="author-focus-item__row">
            <div class="author-focus-item__title">${escapeHtml(item.focus)}</div>
            <span class="author-chip">${escapeHtml(item.source)}</span>
          </div>
          <div class="author-focus-item__detail">${escapeHtml(item.rationale)}</div>
          <div class="author-focus-item__detail">建议带练方式：${escapeHtml(item.coachingCue)}</div>
        </article>
      `).join('')}
    </div>
  `;
  return section;
}

function getEditableCoachingFocusText(currentPackage, manifest) {
  if (currentPackage.manualCoachingFocus?.length) {
    return currentPackage.manualCoachingFocus.join('\n');
  }

  return manifest.confirmedCoachingFocus.map((item) => item.focus).join('\n');
}

function parseLineList(text) {
  return String(text || '')
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
