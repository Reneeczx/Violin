import { getEffectiveBpm } from '../music-theory.js';
import { buildStaffModel } from '../staff-notation.js';
import { createElement } from './components.js';

export function createStaffScoreDisplay(
  section,
  {
    speedFactor = 1,
    activeTokenId = null,
    onExplain = null,
  } = {},
) {
  const beatsPerMeasure = section.timeSignature?.[0] || 4;
  const effectiveBpm = getEffectiveBpm(section.baseBpm || section.bpm || 60, speedFactor);
  const model = buildStaffModel(section.measures, {
    beatsPerMeasure,
    bpm: effectiveBpm,
    timeSignature: section.timeSignature || [4, 4],
  });

  const root = createElement('div', 'staff-score', `
    <div class="staff-score__scroll">
      ${renderStaffSvg(model, activeTokenId)}
    </div>
  `);

  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-notation-token]');
    if (!target || !root.contains(target)) {
      return;
    }

    const token = model.tokensById[target.dataset.notationToken];
    if (token) {
      onExplain?.(token);
    }
  });

  return { root, model };
}

function renderStaffSvg(model, activeTokenId) {
  return `
    <svg
      class="staff-score__svg"
      viewBox="0 0 ${model.width} ${model.height}"
      role="img"
      aria-label="原始五线谱"
    >
      ${model.systems.map((system) => renderSystem(system, activeTokenId)).join('')}
    </svg>
  `;
}

function renderSystem(system, activeTokenId) {
  return `
    <g class="staff-score__system" data-system-index="${system.systemIndex}">
      ${system.lineYs.map((y) => `
        <line
          class="staff-score__line"
          x1="${system.staffStartX}"
          y1="${y}"
          x2="${system.staffEndX}"
          y2="${y}"
        ></line>
      `).join('')}
      ${system.measures.map((measure) => renderMeasure(measure, activeTokenId)).join('')}
      ${system.headerTokens.map((token) => renderHeaderToken(token, activeTokenId)).join('')}
    </g>
  `;
}

function renderHeaderToken(token, activeTokenId) {
  const selectedClass = token.id === activeTokenId ? ' staff-score__token--selected' : '';

  if (token.tokenType === 'clef') {
    return `
      <g class="staff-score__token${selectedClass}" data-notation-token="${token.id}">
        <text class="staff-score__clef" x="${token.x}" y="${token.y}">${token.text}</text>
      </g>
    `;
  }

  if (token.tokenType === 'time-signature') {
    return `
      <g class="staff-score__token${selectedClass}" data-notation-token="${token.id}">
        <text class="staff-score__time" x="${token.x}" y="${token.topY}">${token.topNumber}</text>
        <text class="staff-score__time" x="${token.x}" y="${token.bottomY}">${token.bottomNumber}</text>
      </g>
    `;
  }

  return `
    <g class="staff-score__token${selectedClass}" data-notation-token="${token.id}">
      <text class="staff-score__tempo" x="${token.x}" y="${token.y}">${token.text}</text>
    </g>
  `;
}

function renderMeasure(measure, activeTokenId) {
  return `
    <g class="staff-score__measure" data-measure-index="${measure.measureIndex}">
      <rect
        class="staff-score__measure-box"
        data-measure-index="${measure.measureIndex}"
        x="${measure.x}"
        y="${measure.y}"
        width="${measure.width}"
        height="${measure.height}"
        rx="14"
      ></rect>
      ${measure.beatDots.map((dot) => `
        <circle
          class="staff-score__beat-dot"
          data-measure-index="${dot.measureIndex}"
          data-beat-number="${dot.beatNumber}"
          cx="${dot.cx}"
          cy="${dot.cy}"
          r="3.4"
        ></circle>
      `).join('')}
      ${measure.tokens.map((token) => renderToken(token, activeTokenId)).join('')}
      <line
        class="staff-score__bar"
        x1="${measure.barLineX}"
        y1="${measure.lineYs[0]}"
        x2="${measure.barLineX}"
        y2="${measure.lineYs.at(-1)}"
      ></line>
    </g>
  `;
}

function renderToken(token, activeTokenId) {
  const selectedClass = token.id === activeTokenId ? ' staff-score__token--selected' : '';
  const activeData = token.noteIndex != null ? ` data-note-index="${token.noteIndex}"` : '';
  const measureData = token.measureIndex != null ? ` data-measure-index="${token.measureIndex}"` : '';

  if (token.tokenType === 'rest') {
    return `
      <g
        class="staff-score__token staff-score__rest${selectedClass}"
        data-notation-token="${token.id}"${activeData}${measureData}
      >
        ${renderRestShape(token)}
      </g>
    `;
  }

  return `
    <g
      class="staff-score__token staff-score__note${selectedClass}"
      data-notation-token="${token.id}"${activeData}${measureData}
    >
      ${token.ledgerLineYs.map((y) => `
        <line
          class="staff-score__ledger"
          x1="${token.x - 14}"
          y1="${y}"
          x2="${token.x + 14}"
          y2="${y}"
        ></line>
      `).join('')}
      ${renderNoteShape(token)}
    </g>
  `;
}

function renderNoteShape(token) {
  const isFilled = token.duration !== 'whole' && token.duration !== 'half';
  const hasStem = token.duration !== 'whole';
  const stem = hasStem
    ? token.stemDirection === 'down'
      ? `
        <line
          class="staff-score__stem"
          x1="${token.x - 7}"
          y1="${token.y}"
          x2="${token.x - 7}"
          y2="${token.y + 30}"
        ></line>
      `
      : `
        <line
          class="staff-score__stem"
          x1="${token.x + 7}"
          y1="${token.y}"
          x2="${token.x + 7}"
          y2="${token.y - 30}"
        ></line>
      `
    : '';

  return `
    <ellipse
      class="staff-score__notehead${isFilled ? ' staff-score__notehead--filled' : ''}"
      cx="${token.x}"
      cy="${token.y}"
      rx="8"
      ry="5.6"
      transform="rotate(-18 ${token.x} ${token.y})"
    ></ellipse>
    ${stem}
  `;
}

function renderRestShape(token) {
  if (token.duration === 'whole') {
    return `
      <rect
        class="staff-score__rest-shape"
        x="${token.x - 11}"
        y="${token.lineYs[1] + 1}"
        width="22"
        height="6"
        rx="1.5"
      ></rect>
    `;
  }

  if (token.duration === 'half') {
    return `
      <rect
        class="staff-score__rest-shape"
        x="${token.x - 11}"
        y="${token.lineYs[2] - 6}"
        width="22"
        height="6"
        rx="1.5"
      ></rect>
    `;
  }

  return `
    <path
      class="staff-score__rest-shape"
      d="M ${token.x - 3} ${token.y - 18}
         Q ${token.x + 5} ${token.y - 12} ${token.x - 1} ${token.y - 5}
         Q ${token.x - 6} ${token.y + 1} ${token.x + 3} ${token.y + 7}
         L ${token.x - 2} ${token.y + 19}
         L ${token.x + 6} ${token.y + 12}"
    ></path>
  `;
}
