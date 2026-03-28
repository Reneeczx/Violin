import {
  LEARNING_CONTENT,
  buildLearningIndex,
  buildLearningRelationships,
  getLearningDefaults,
} from '../learn-data.js';

const CONTENT = LEARNING_CONTENT;
const INDEX = buildLearningIndex(CONTENT);
const RELATIONSHIPS = buildLearningRelationships(CONTENT);

const CATEGORY_META = [
  { id: 'Shell', label: '入口层', hint: '启动、路由、事件协作' },
  { id: 'Data', label: '数据层', hint: '课程数据与计划转换' },
  { id: 'UI', label: '页面层', hint: '页面装配与交互入口' },
  { id: 'Playback', label: '播放层', hint: '状态机、时间线、音频调度' },
  { id: 'Persistence', label: '持久化层', hint: '本地存储与录音数据' },
  { id: 'Learning', label: '学习层', hint: '乐理解释与提示文案' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_META.map((item) => [item.id, item.label]));

const GRAPH = {
  paddingX: 28,
  paddingY: 28,
  laneWidth: 184,
  laneGap: 16,
  laneHeaderHeight: 58,
  nodeWidth: 160,
  nodeHeight: 84,
  nodeGapY: 22,
};

const GRAPH_LAYOUT = buildGraphLayout(CONTENT.modules);

let _container = null;
let _state = createInitialState();

export function init(container) {
  _container = container;
  _container.addEventListener('click', onClick);
}

export function show() {
  _state = createInitialState();
  render();
}

export function hide() {}

function createInitialState() {
  const defaults = getLearningDefaults();
  return {
    moduleId: defaults.moduleId,
    flowId: defaults.flowId,
  };
}

function onClick(event) {
  const actionEl = event.target.closest('[data-learn-action]');
  if (!actionEl || !_container.contains(actionEl)) {
    return;
  }

  const action = actionEl.dataset.learnAction;
  if (action === 'pick-module') {
    _state = { ..._state, moduleId: actionEl.dataset.moduleId };
    render();
    return;
  }

  if (action === 'pick-flow') {
    const nextFlow = INDEX.flowsById[actionEl.dataset.flowId];
    if (!nextFlow) {
      return;
    }

    _state = {
      ..._state,
      flowId: nextFlow.id,
      moduleId: nextFlow.moduleIds.includes(_state.moduleId) ? _state.moduleId : nextFlow.moduleIds[0],
    };
    render();
  }
}

function render() {
  const activeModule = INDEX.modulesById[_state.moduleId] || CONTENT.modules[0];
  const activeFlow = INDEX.flowsById[_state.flowId] || CONTENT.flows[0];
  const incomingIds = RELATIONSHIPS.incomingById[activeModule.id] || [];
  const outgoingIds = RELATIONSHIPS.outgoingById[activeModule.id] || [];
  const flowModuleIds = new Set(activeFlow.moduleIds);
  const flowStepByModuleId = Object.fromEntries(activeFlow.steps.map((step, index) => [step.moduleId, index + 1]));
  const activeFlowStep = activeFlow.steps.find((step) => step.moduleId === activeModule.id) || null;
  const relatedIds = new Set([activeModule.id, ...incomingIds, ...outgoingIds]);
  const conceptCards = activeModule.concepts
    .map((conceptId) => INDEX.termsById[conceptId])
    .filter(Boolean)
    .slice(0, 3);
  const codeReadings = (INDEX.codeReadingsByModuleId[activeModule.id] || []).slice(0, 2);

  _container.innerHTML = `
    <div class="learn-shell">
      <section class="card learn-hero">
        <div class="learn-hero__grid">
          <div>
            <div class="learn-hero__eyebrow">Learning Mode</div>
            <h2 class="learn-hero__title">先看图，再看概念，最后看关键代码</h2>
            <p class="learn-hero__summary">
              这页只保留三层信息：模块关系、当前主线、当前模块真正需要的概念和 1 到 2 段关键代码。
            </p>
          </div>
          <div class="learn-hero__panel">
            <div class="learn-rule">
              <span class="learn-rule__badge">读图规则</span>
              <span class="learn-rule__expr">A → B</span>
              <span class="learn-rule__text">表示 A 会调用、使用或依赖 B</span>
            </div>
            <div class="learn-legend">
              ${renderLegendItem('dependency', '浅色线', '稳定依赖关系')}
              ${renderLegendItem('flow', '亮色线', '当前主线 / 数据流')}
              ${renderLegendItem('selected', '描边节点', '当前选中的模块')}
            </div>
          </div>
        </div>
        <div class="learn-pill-row">
          ${CONTENT.flows.map((flow) => `
            <button
              class="learn-pill${flow.id === activeFlow.id ? ' learn-pill--active' : ''}"
              data-learn-action="pick-flow"
              data-flow-id="${flow.id}"
            >
              ${escapeHtml(flow.title)}
            </button>
          `).join('')}
        </div>
      </section>

      <section class="learn-stage">
        <section class="card learn-graph-card">
          <div class="learn-section-header">
            <div>
              <div class="learn-section-header__eyebrow">Module Graph</div>
              <h3 class="learn-section-header__title">模块关系图</h3>
            </div>
            <div class="learn-section-header__hint">
              线条只负责解释关系，节点本身才是重点。点任意模块后，下面会切换到对应概念和代码解读。
            </div>
          </div>
          <div class="learn-diagram__legend">
            <div class="learn-inline-legend">
              <span class="learn-inline-legend__dot learn-inline-legend__dot--dependency"></span>
              <span>依赖关系</span>
            </div>
            <div class="learn-inline-legend">
              <span class="learn-inline-legend__dot learn-inline-legend__dot--flow"></span>
              <span>${escapeHtml(activeFlow.title)}</span>
            </div>
            <div class="learn-inline-legend">
              <span class="learn-inline-legend__dot learn-inline-legend__dot--selected"></span>
              <span>${escapeHtml(activeModule.title)}</span>
            </div>
          </div>
          <div class="learn-graph-scroll">
            <div
              class="learn-graph-board"
              style="width: ${GRAPH_LAYOUT.width}px; height: ${GRAPH_LAYOUT.height}px;"
            >
              ${GRAPH_LAYOUT.lanes.map(renderGraphLane).join('')}
              <svg
                class="learn-graph-svg"
                viewBox="0 0 ${GRAPH_LAYOUT.width} ${GRAPH_LAYOUT.height}"
                aria-hidden="true"
              >
                <defs>
                  <marker id="learn-arrow-base" markerWidth="6" markerHeight="6" refX="5.4" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#c8b8a5"></path>
                  </marker>
                  <marker id="learn-arrow-active" markerWidth="6" markerHeight="6" refX="5.4" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#5b8dbe"></path>
                  </marker>
                  <marker id="learn-arrow-flow" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#c47420"></path>
                  </marker>
                </defs>
                <g class="learn-graph-svg__deps">
                  ${RELATIONSHIPS.edges.map((edge) => renderDependencyEdge(edge, activeModule.id)).join('')}
                </g>
                <g class="learn-graph-svg__flows">
                  ${renderFlowEdges(activeFlow)}
                </g>
              </svg>
              ${CONTENT.modules.map((module) => (
                renderGraphNode(module, activeModule.id, flowModuleIds, relatedIds, flowStepByModuleId)
              )).join('')}
            </div>
          </div>
        </section>

        <section class="card learn-flow-card">
          <div class="learn-section-header">
            <div>
              <div class="learn-section-header__eyebrow">Current Flow</div>
              <h3 class="learn-section-header__title">当前主线 / 数据流</h3>
            </div>
            <div class="learn-section-header__hint">${escapeHtml(activeFlow.summary)}</div>
          </div>
          <div class="learn-flow-strip">
            ${activeFlow.steps.map((step, index) => renderFlowStep(step, index, activeModule.id)).join('')}
          </div>
          <div class="learn-flow-card__question">
            <strong>边看边问：</strong> ${escapeHtml(activeFlow.starterQuestion)}
          </div>
        </section>

        <section class="learn-detail-stack">
          <section class="card learn-module-card">
            <div class="learn-module-card__top">
              <div>
                <div class="learn-section-header__eyebrow">Selected Module</div>
                <h3 class="learn-section-header__title">${escapeHtml(activeModule.title)}</h3>
              </div>
              <span class="learn-badge">${escapeHtml(CATEGORY_LABELS[activeModule.category] || activeModule.category)}</span>
            </div>
            <p class="learn-module-card__summary">${escapeHtml(activeModule.summary)}</p>
            <div class="learn-module-card__file">
              <code>${escapeHtml(activeModule.file)}</code>
            </div>

            <div class="learn-status-grid">
              ${renderFlowStatusCard(activeFlow, activeFlowStep)}
              ${renderNeighborStatusCard(incomingIds.length, outgoingIds.length)}
            </div>

            <div class="learn-module-card__body">
              <div class="learn-module-card__column">
                <div class="learn-inline-section">
                  <div class="learn-inline-section__title">谁会用到它</div>
                  <div class="learn-inline-list">
                    ${renderModuleChips(incomingIds, activeModule.id, flowModuleIds)}
                  </div>
                </div>

                <div class="learn-inline-section">
                  <div class="learn-inline-section__title">它会调用谁</div>
                  <div class="learn-inline-list">
                    ${renderModuleChips(outgoingIds, activeModule.id, flowModuleIds)}
                  </div>
                </div>
              </div>

              <div class="learn-module-card__column">
                <div class="learn-meta-block">
                  <div class="learn-meta-block__label">为什么重要</div>
                  <div class="learn-meta-block__content">${escapeHtml(activeModule.whyItMatters)}</div>
                </div>

                <div class="learn-meta-block">
                  <div class="learn-meta-block__label">它负责什么</div>
                  <ul class="learn-bullet-list">
                    ${activeModule.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>

            <div class="learn-module-card__inspect">
              <strong>建议这样读：</strong> ${escapeHtml(activeModule.inspect)}
            </div>
          </section>

          <section class="learn-detail-grid">
            <section class="card learn-concepts-card">
              <div class="learn-section-header">
                <div>
                  <div class="learn-section-header__eyebrow">Concepts For Current Module</div>
                  <h3 class="learn-section-header__title">关键概念</h3>
                </div>
                <div class="learn-section-header__hint">
                  只显示当前模块真正需要的概念，不做完整术语表。
                </div>
              </div>
              <div class="learn-concept-list">
                ${conceptCards.length > 0
                  ? conceptCards.map(renderConceptCard).join('')
                  : '<div class="learn-empty-card">这个模块这次不补新术语，重点直接看右侧代码解读。</div>'}
              </div>
            </section>

            <section class="card learn-code-card">
              <div class="learn-section-header">
                <div>
                  <div class="learn-section-header__eyebrow">Core Code Reading</div>
                  <h3 class="learn-section-header__title">核心代码解读</h3>
                </div>
                <div class="learn-section-header__hint">
                  每个模块只讲 1 到 2 段关键代码，重点解释“它在做什么”和“为什么这样设计”。
                </div>
              </div>
              <div class="learn-reading-list">
                ${codeReadings.length > 0
                  ? codeReadings.map((reading, index) => renderCodeReading(reading, index, codeReadings.length)).join('')
                  : '<div class="learn-empty-card">这个模块的代码解读还没有补充。</div>'}
              </div>
            </section>
          </section>
        </section>
      </section>
    </div>
  `;
}

function buildGraphLayout(modules) {
  const categoryIds = CATEGORY_META.map((item) => item.id);
  const modulesByCategory = Object.fromEntries(categoryIds.map((categoryId) => [categoryId, []]));

  modules.forEach((module) => {
    if (modulesByCategory[module.category]) {
      modulesByCategory[module.category].push(module);
    }
  });

  const maxRows = Math.max(...categoryIds.map((categoryId) => modulesByCategory[categoryId].length));
  const laneBodyHeight = maxRows * GRAPH.nodeHeight + Math.max(0, maxRows - 1) * GRAPH.nodeGapY;
  const width = GRAPH.paddingX * 2 + categoryIds.length * GRAPH.laneWidth + (categoryIds.length - 1) * GRAPH.laneGap;
  const height = GRAPH.paddingY * 2 + GRAPH.laneHeaderHeight + laneBodyHeight;

  const laneIndexByCategory = {};
  const lanes = CATEGORY_META.map((category, index) => {
    laneIndexByCategory[category.id] = index;
    const laneModules = modulesByCategory[category.id];
    const usedHeight = laneModules.length * GRAPH.nodeHeight + Math.max(0, laneModules.length - 1) * GRAPH.nodeGapY;
    const startY = GRAPH.paddingY + GRAPH.laneHeaderHeight + (laneBodyHeight - usedHeight) / 2;

    return {
      ...category,
      x: GRAPH.paddingX + index * (GRAPH.laneWidth + GRAPH.laneGap),
      y: GRAPH.paddingY,
      width: GRAPH.laneWidth,
      height: height - GRAPH.paddingY * 2,
      startY,
      modules: laneModules,
    };
  });

  const positions = {};
  lanes.forEach((lane) => {
    lane.modules.forEach((module, index) => {
      const x = lane.x + (lane.width - GRAPH.nodeWidth) / 2;
      const y = lane.startY + index * (GRAPH.nodeHeight + GRAPH.nodeGapY);
      positions[module.id] = {
        x,
        y,
        centerX: x + GRAPH.nodeWidth / 2,
        centerY: y + GRAPH.nodeHeight / 2,
      };
    });
  });

  return {
    width,
    height,
    lanes,
    positions,
    laneIndexByCategory,
  };
}

function renderLegendItem(kind, label, detail) {
  return `
    <div class="learn-legend-item">
      <span class="learn-legend-item__swatch learn-legend-item__swatch--${kind}"></span>
      <span>
        <strong>${escapeHtml(label)}</strong>
        <span class="learn-legend-item__detail">${escapeHtml(detail)}</span>
      </span>
    </div>
  `;
}

function renderGraphLane(lane) {
  return `
    <div
      class="learn-graph-lane learn-graph-lane--${lane.id.toLowerCase()}"
      style="left: ${lane.x}px; top: ${lane.y}px; width: ${lane.width}px; height: ${lane.height}px;"
    >
      <div class="learn-graph-lane__title">${escapeHtml(lane.label)}</div>
      <div class="learn-graph-lane__hint">${escapeHtml(lane.hint)}</div>
    </div>
  `;
}

function renderGraphNode(module, activeModuleId, flowModuleIds, relatedIds, flowStepByModuleId) {
  const position = GRAPH_LAYOUT.positions[module.id];
  if (!position) {
    return '';
  }

  const classes = [
    'learn-graph-node',
    module.id === activeModuleId ? 'learn-graph-node--active' : '',
    flowModuleIds.has(module.id) ? 'learn-graph-node--flow' : '',
    relatedIds.has(module.id) && module.id !== activeModuleId ? 'learn-graph-node--related' : '',
  ].filter(Boolean).join(' ');

  const flowStep = flowStepByModuleId[module.id];

  return `
    <button
      class="${classes}"
      data-learn-action="pick-module"
      data-module-id="${module.id}"
      style="left: ${position.x}px; top: ${position.y}px;"
      title="${escapeHtml(module.file)}"
      aria-pressed="${module.id === activeModuleId ? 'true' : 'false'}"
    >
      ${flowStep ? `<span class="learn-graph-node__step">${flowStep}</span>` : ''}
      <span class="learn-graph-node__title">${escapeHtml(module.title)}</span>
      <span class="learn-graph-node__file">${escapeHtml(module.file)}</span>
      <span class="learn-graph-node__prompt">点击切换到概念与代码解读</span>
    </button>
  `;
}

function renderDependencyEdge(edge, activeModuleId) {
  const isActive = edge.from === activeModuleId || edge.to === activeModuleId;

  return `
    <path
      class="learn-graph-edge${isActive ? ' learn-graph-edge--active' : ''}"
      d="${buildDependencyPath(edge.from, edge.to)}"
      marker-end="url(#${isActive ? 'learn-arrow-active' : 'learn-arrow-base'})"
    ></path>
  `;
}

function renderFlowEdges(flow) {
  const edges = flow.steps.slice(0, -1).map((step, index) => ({
    from: step.moduleId,
    to: flow.steps[index + 1].moduleId,
  }));

  return edges.map((edge) => {
    const path = buildFlowPath(edge.from, edge.to);
    return `
      <path class="learn-graph-flow-shadow" d="${path}"></path>
      <path class="learn-graph-flow" d="${path}" marker-end="url(#learn-arrow-flow)"></path>
    `;
  }).join('');
}

function buildDependencyPath(fromId, toId) {
  const from = GRAPH_LAYOUT.positions[fromId];
  const to = GRAPH_LAYOUT.positions[toId];
  if (!from || !to) {
    return '';
  }

  const fromLane = GRAPH_LAYOUT.laneIndexByCategory[INDEX.modulesById[fromId].category];
  const toLane = GRAPH_LAYOUT.laneIndexByCategory[INDEX.modulesById[toId].category];

  if (fromLane === toLane) {
    const startX = from.x + GRAPH.nodeWidth;
    const endX = to.x + GRAPH.nodeWidth;
    const controlX = Math.max(startX, endX) + 26;
    return `M ${startX} ${from.centerY} C ${controlX} ${from.centerY}, ${controlX} ${to.centerY}, ${endX} ${to.centerY}`;
  }

  const leftToRight = to.centerX > from.centerX;
  const startX = leftToRight ? from.x + GRAPH.nodeWidth : from.x;
  const endX = leftToRight ? to.x : to.x + GRAPH.nodeWidth;
  const bend = Math.min(132, Math.max(56, Math.abs(endX - startX) * 0.4));

  return [
    `M ${startX} ${from.centerY}`,
    `C ${startX + (leftToRight ? bend : -bend)} ${from.centerY},`,
    `${endX - (leftToRight ? bend : -bend)} ${to.centerY},`,
    `${endX} ${to.centerY}`,
  ].join(' ');
}

function buildFlowPath(fromId, toId) {
  const from = GRAPH_LAYOUT.positions[fromId];
  const to = GRAPH_LAYOUT.positions[toId];
  if (!from || !to) {
    return '';
  }

  const fromLane = GRAPH_LAYOUT.laneIndexByCategory[INDEX.modulesById[fromId].category];
  const toLane = GRAPH_LAYOUT.laneIndexByCategory[INDEX.modulesById[toId].category];

  if (fromLane === toLane) {
    const startX = from.centerX;
    const startY = from.y + GRAPH.nodeHeight;
    const endX = to.centerX;
    const endY = to.y;
    const midY = startY + (endY - startY) / 2;
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  }

  const leftToRight = to.centerX > from.centerX;
  const startX = leftToRight ? from.x + GRAPH.nodeWidth : from.x;
  const endX = leftToRight ? to.x : to.x + GRAPH.nodeWidth;
  const midX = (startX + endX) / 2;

  return `M ${startX} ${from.centerY} C ${midX} ${from.centerY - 14}, ${midX} ${to.centerY - 14}, ${endX} ${to.centerY}`;
}

function renderFlowStep(step, index, activeModuleId) {
  const module = INDEX.modulesById[step.moduleId];
  return `
    <button
      class="learn-flow-step${step.moduleId === activeModuleId ? ' learn-flow-step--active' : ''}"
      data-learn-action="pick-module"
      data-module-id="${step.moduleId}"
    >
      <span class="learn-flow-step__index">${index + 1}</span>
      <span class="learn-flow-step__body">
        <span class="learn-flow-step__module">${escapeHtml(module.title)}</span>
        <span class="learn-flow-step__title">${escapeHtml(step.title)}</span>
        <span class="learn-flow-step__detail">${escapeHtml(step.detail)}</span>
      </span>
    </button>
  `;
}

function renderFlowStatusCard(flow, flowStep) {
  if (!flowStep) {
    return `
      <div class="learn-status-card learn-status-card--muted">
        <div class="learn-status-card__eyebrow">Current Flow</div>
        <div class="learn-status-card__title">当前主线不会经过它</div>
        <div class="learn-status-card__copy">
          现在看的主线是“${escapeHtml(flow.title)}”，你可以继续通过图观察它和别的模块怎样连接。
        </div>
      </div>
    `;
  }

  const stepIndex = flow.steps.findIndex((step) => step.moduleId === flowStep.moduleId) + 1;

  return `
    <div class="learn-status-card">
      <div class="learn-status-card__eyebrow">Current Flow</div>
      <div class="learn-status-card__title">第 ${stepIndex} 步 · ${escapeHtml(flowStep.title)}</div>
      <div class="learn-status-card__copy">${escapeHtml(flowStep.detail)}</div>
    </div>
  `;
}

function renderNeighborStatusCard(incomingCount, outgoingCount) {
  return `
    <div class="learn-status-card">
      <div class="learn-status-card__eyebrow">Neighborhood</div>
      <div class="learn-status-card__title">上游 ${incomingCount} 个 · 下游 ${outgoingCount} 个</div>
      <div class="learn-status-card__copy">上游表示谁会用到它，下游表示它会依赖或调用谁。</div>
    </div>
  `;
}

function renderModuleChips(moduleIds, activeModuleId, flowModuleIds) {
  if (moduleIds.length === 0) {
    return '<span class="learn-inline-empty">无</span>';
  }

  return moduleIds.map((moduleId) => renderModuleChip(moduleId, activeModuleId, flowModuleIds)).join('');
}

function renderModuleChip(moduleId, activeModuleId, flowModuleIds, { active = false } = {}) {
  const module = INDEX.modulesById[moduleId];
  if (!module) {
    return '';
  }

  const classes = [
    'learn-link-chip',
    active || moduleId === activeModuleId ? 'learn-link-chip--active' : '',
    flowModuleIds.has(moduleId) ? 'learn-link-chip--flow' : '',
  ].filter(Boolean).join(' ');

  return `
    <button
      class="${classes}"
      data-learn-action="pick-module"
      data-module-id="${module.id}"
      title="${escapeHtml(module.file)}"
    >
      ${escapeHtml(module.title)}
    </button>
  `;
}

function renderConceptCard(concept) {
  return `
    <article class="learn-concept-card">
      <div class="learn-concept-card__term">${escapeHtml(concept.label)}</div>
      <div class="learn-concept-card__plain">${escapeHtml(concept.plain)}</div>
      <div class="learn-concept-card__example">${escapeHtml(concept.projectExample)}</div>
      <div class="learn-concept-card__check">
        <strong>自检：</strong> ${escapeHtml(concept.checkYourself)}
      </div>
    </article>
  `;
}

function renderCodeReading(reading, index, total) {
  return `
    <article class="learn-reading-card">
      <div class="learn-reading-card__meta">
        <span class="learn-reading-chip">文件：${escapeHtml(reading.file)}</span>
        <span class="learn-reading-chip">片段 ${index + 1} / ${total}</span>
      </div>
      <h4 class="learn-reading-card__title">${escapeHtml(reading.title)}</h4>
      <pre class="learn-codeblock"><code>${escapeHtml(reading.excerpt)}</code></pre>
      <div class="learn-reading-card__notes">
        <div><strong>它在做什么：</strong> ${escapeHtml(reading.what)}</div>
        <div><strong>为什么这样设计：</strong> ${escapeHtml(reading.why)}</div>
        <div><strong>继续追读：</strong> ${escapeHtml(reading.followUp)}</div>
      </div>
    </article>
  `;
}

function renderLegendItemSwatch(kind) {
  return `<span class="learn-legend-item__swatch learn-legend-item__swatch--${kind}"></span>`;
}

function renderMetaBlock(label, content) {
  return `
    <div class="learn-meta-block">
      <div class="learn-meta-block__label">${escapeHtml(label)}</div>
      <div class="learn-meta-block__content">${content}</div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
