import {
  createSpeedGroup,
  createElement,
} from './components.js';
import {
  buildSpeedOptions,
  formatTempoMarking,
  getEffectiveBpm,
} from '../music-theory.js';

export function renderPiecePlaybackControls(card, section, deps) {
  const beatsPerMeasure = section.timeSignature?.[0] || 4;

  const controls = createElement('div', 'controls', '');
  controls.style.marginTop = 'var(--space-sm)';
  controls.style.alignItems = 'center';

  const speedGroup = createSpeedGroup(
    buildSpeedOptions(section.recommendedSpeedFactor || section.bpmFactor || 1),
    deps.getSpeed(section.id),
    (speed) => {
      deps.setSpeed(section.id, speed);
      deps.onSpeedChange(section.id);
    },
  );
  controls.appendChild(speedGroup);

  const bpmEl = createElement('span', 'bpm-display', '');
  controls.appendChild(bpmEl);
  card.appendChild(controls);

  const metVisual = createElement('div', 'metronome-visual');
  metVisual.id = `met-visual-${section.id}`;
  metVisual.style.margin = 'var(--space-sm) 0';
  metVisual.style.display = 'none';
  for (let i = 0; i < beatsPerMeasure; i += 1) {
    metVisual.appendChild(createElement('div', 'metronome-beat'));
  }
  card.appendChild(metVisual);

  const btnRow = createElement('div', 'controls', '');
  btnRow.style.marginTop = 'var(--space-sm)';

  const playBtn = createElement('button', 'btn btn--secondary', '▶ 播放示范');
  playBtn.id = `play-btn-${section.id}`;
  playBtn.addEventListener('click', async () => {
    await deps.ensureAudioContext();
    await deps.startDemo(section, deps.getSpeed(section.id));
  });
  btnRow.appendChild(playBtn);

  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.id = `met-btn-${section.id}`;
  metBtn.addEventListener('click', async () => {
    await deps.ensureAudioContext();
    await deps.toggleClick(section, deps.getSpeed(section.id));
  });
  btnRow.appendChild(metBtn);

  card.appendChild(btnRow);
  return { bpmEl, metVisual };
}

export function renderStringsPlaybackControls(card, section, deps) {
  const stringsEl = createElement('div', 'controls controls--center', '');
  stringsEl.style.margin = 'var(--space-md) 0';
  stringsEl.style.gap = 'var(--space-md)';

  section.strings.forEach((stringData) => {
    const btn = createElement('button', 'btn btn--secondary', '');
    btn.style.flexDirection = 'column';
    btn.style.minWidth = '64px';
    btn.style.borderLeft = `4px solid ${stringData.color}`;
    btn.dataset.referenceSection = section.id;
    btn.dataset.referencePitch = stringData.pitch;
    btn.dataset.referenceColor = stringData.color;
    btn.innerHTML = `
      <strong style="font-size: var(--font-size-xl);">${stringData.name}</strong>
      <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${stringData.solfege}</span>
    `;

    btn.addEventListener('click', async () => {
      await deps.ensureAudioContext();
      await deps.toggleReference(section.id, stringData.pitch);
    });

    stringsEl.appendChild(btn);
  });
  card.appendChild(stringsEl);

  const btnRow = createElement('div', 'controls controls--center', '');

  const metBtn = createElement('button', 'btn btn--ghost', '🔔 节拍器');
  metBtn.id = `met-btn-${section.id}`;
  metBtn.addEventListener('click', async () => {
    await deps.ensureAudioContext();
    await deps.toggleClick(section);
  });
  btnRow.appendChild(metBtn);

  card.appendChild(btnRow);
}

export function syncPiecePlaybackUi(section, playerState) {
  const playBtn = document.getElementById(`play-btn-${section.id}`);
  const metBtn = document.getElementById(`met-btn-${section.id}`);
  const metVisual = document.getElementById(`met-visual-${section.id}`);
  const uiState = getPiecePlaybackUiState(playerState, section.id);

  if (playBtn) {
    playBtn.textContent = uiState.playButtonText;
    playBtn.classList.toggle('btn--primary', uiState.playButtonPrimary);
    playBtn.classList.toggle('btn--secondary', !uiState.playButtonPrimary);
  }

  if (metBtn) {
    metBtn.textContent = uiState.metButtonText;
    metBtn.classList.toggle('btn--recording', uiState.metButtonRecording);
    metBtn.disabled = uiState.metButtonDisabled;
  }

  if (metVisual) {
    metVisual.style.display = uiState.showMetVisual ? 'flex' : 'none';
  }
}

export function syncStringsPlaybackUi(section, playerState) {
  const metBtn = document.getElementById(`met-btn-${section.id}`);
  const uiState = getStringsPlaybackUiState(playerState, section.id);

  clearReferenceButtons(section.id);
  if (uiState.activePitch) {
    setReferenceButtonsActive(section.id, uiState.activePitch);
  }

  if (metBtn) {
    metBtn.textContent = uiState.metButtonText;
    metBtn.classList.toggle('btn--recording', uiState.metButtonRecording);
    metBtn.disabled = uiState.metButtonDisabled;
  }
}

export function syncPieceTempoDisplay(card, section, bpmEl, speed) {
  const currentBpm = getEffectiveBpm(section.baseBpm, speed);
  const badge = card.querySelector('.card__badge');

  if (badge) {
    badge.textContent = formatTempoMarking(currentBpm);
  }

  if (bpmEl) {
    bpmEl.textContent = `当前 ${formatTempoMarking(currentBpm)} · 原速 ${formatTempoMarking(section.originalBpm || section.baseBpm)}`;
  }
}

export function clearReferenceButtons(sectionId = null) {
  const selector = sectionId
    ? `[data-reference-section="${sectionId}"]`
    : '[data-reference-section]';
  document.querySelectorAll(selector).forEach((button) => {
    button.style.transform = '';
    button.style.boxShadow = '';
  });
}

export function setReferenceButtonsActive(sectionId, pitch) {
  document.querySelectorAll(`[data-reference-section="${sectionId}"]`).forEach((button) => {
    const isActive = button.dataset.referencePitch === pitch;
    button.style.transform = isActive ? 'scale(1.08)' : '';
    button.style.boxShadow = isActive ? `0 0 0 3px ${button.dataset.referenceColor}40` : '';
  });
}

export function getPiecePlaybackUiState(playerState, sectionId) {
  const isDemo = playerState.mode === 'demo' && playerState.sectionId === sectionId;
  const isClickOnly = playerState.mode === 'click' && playerState.sectionId === sectionId;
  const isAnyDemo = playerState.mode === 'demo';

  return {
    isDemo,
    isClickOnly,
    isAnyDemo,
    playButtonText: isDemo ? '⏹ 停止' : '▶ 播放示范',
    playButtonPrimary: isDemo,
    metButtonText: isClickOnly
      ? '⏹ 停止节拍器'
      : isAnyDemo
        ? '示范播放中'
        : '🔔 节拍器',
    metButtonDisabled: isAnyDemo && !isClickOnly,
    metButtonRecording: isClickOnly,
    showMetVisual: isClickOnly,
  };
}

export function getStringsPlaybackUiState(playerState, sectionId) {
  const isClickOnly = playerState.mode === 'click' && playerState.sectionId === sectionId;
  const isAnyDemo = playerState.mode === 'demo';
  const isReference = playerState.mode === 'reference' && playerState.sectionId === sectionId;

  return {
    isClickOnly,
    isAnyDemo,
    isReference,
    activePitch: isReference ? playerState.pitch : null,
    metButtonText: isClickOnly
      ? '⏹ 停止节拍器'
      : isAnyDemo
        ? '示范播放中'
        : '🔔 节拍器',
    metButtonDisabled: isAnyDemo && !isClickOnly,
    metButtonRecording: isClickOnly,
  };
}
