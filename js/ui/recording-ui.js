import Recorder from '../recorder.js';
import { createElement } from './components.js';

export function createRecordButton(exerciseId, sessionContext) {
  const recBtn = createElement('button', 'btn btn--ghost', '🎤 录音');
  let recording = false;

  recBtn.addEventListener('click', async () => {
    if (!recording) {
      try {
        await Recorder.startRecording(exerciseId, sessionContext.dayNumber, sessionContext.weekOf);
        recording = true;
        recBtn.textContent = '⏹ 停止录音';
        recBtn.classList.add('btn--recording');
      } catch (error) {
        alert('无法访问麦克风，请检查权限设置。');
        console.error('Recording error:', error);
      }
      return;
    }

    const meta = await Recorder.stopRecording();
    recording = false;
    recBtn.textContent = '🎤 录音';
    recBtn.classList.remove('btn--recording');

    if (meta) {
      const listEl = recBtn.closest('.card')?.querySelector('.recording-list');
      if (listEl) {
        refreshRecordingList(listEl, exerciseId, sessionContext);
      }
    }
  });

  return recBtn;
}

export function renderRecordingSection(card, section, sessionContext) {
  if (section.type === 'warmup' || section.type === 'cooldown') {
    return;
  }

  const buttonRow = card.querySelector('.controls:last-of-type');
  buttonRow?.appendChild(createRecordButton(section.id, sessionContext));

  const container = createElement('div', '', '');
  container.style.marginTop = 'var(--space-md)';

  const listEl = createElement('div', 'recording-list');
  listEl.dataset.exerciseId = section.id;
  container.appendChild(listEl);

  card.appendChild(container);
  refreshRecordingList(listEl, section.id, sessionContext);
}

export async function refreshRecordingList(listEl, exerciseId, sessionContext) {
  const recordings = await Recorder.getRecordings(exerciseId, sessionContext.dayNumber, sessionContext.weekOf);
  if (!recordings || recordings.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = `<div style="font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:var(--space-xs);">🎤 今日录音 (${recordings.length})</div>`;

  recordings.forEach((recording) => {
    const item = createElement('div', 'recording-item');
    const time = new Date(recording.createdAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const durationSec = Math.round((recording.durationMs || 0) / 1000);

    item.innerHTML = `
      <div class="recording-item__info">
        <div class="recording-item__time">${time}</div>
        <div class="recording-item__duration">${durationSec}秒</div>
      </div>
    `;

    const playBtn = createElement('button', 'btn btn--icon btn--ghost', '▶');
    playBtn.addEventListener('click', () => {
      Recorder.playRecording(recording.id);
      playBtn.textContent = '⏹';
      window.setTimeout(() => {
        playBtn.textContent = '▶';
      }, (recording.durationMs || 5000) + 500);
    });
    item.appendChild(playBtn);

    const delBtn = createElement('button', 'btn btn--icon btn--ghost', '🗏');
    delBtn.addEventListener('click', async () => {
      if (confirm('删除这条录音？')) {
        await Recorder.deleteRecording(recording.id);
        refreshRecordingList(listEl, exerciseId, sessionContext);
      }
    });
    item.appendChild(delBtn);

    listEl.appendChild(item);
  });
}
