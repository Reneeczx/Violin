import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPiecePlaybackUiState,
  getStringsPlaybackUiState,
} from '../js/ui/playback-controls.js';

test('getPiecePlaybackUiState returns idle defaults', () => {
  const uiState = getPiecePlaybackUiState({
    mode: 'idle',
    sectionId: null,
    pitch: null,
  }, 'piece-a');

  assert.deepEqual(uiState, {
    isDemo: false,
    isClickOnly: false,
    isAnyDemo: false,
    playButtonText: '▶ 播放示范',
    playButtonPrimary: false,
    metButtonText: '🔔 节拍器',
    metButtonDisabled: false,
    metButtonRecording: false,
    showMetVisual: false,
  });
});

test('getPiecePlaybackUiState marks current section demo state', () => {
  const uiState = getPiecePlaybackUiState({
    mode: 'demo',
    sectionId: 'piece-a',
  }, 'piece-a');

  assert.equal(uiState.isDemo, true);
  assert.equal(uiState.playButtonText, '⏹ 停止');
  assert.equal(uiState.playButtonPrimary, true);
  assert.equal(uiState.metButtonText, '示范播放中');
  assert.equal(uiState.metButtonDisabled, true);
  assert.equal(uiState.showMetVisual, false);
});

test('getPiecePlaybackUiState marks click-only state for the current section', () => {
  const uiState = getPiecePlaybackUiState({
    mode: 'click',
    sectionId: 'piece-a',
  }, 'piece-a');

  assert.equal(uiState.isClickOnly, true);
  assert.equal(uiState.metButtonText, '⏹ 停止节拍器');
  assert.equal(uiState.metButtonDisabled, false);
  assert.equal(uiState.metButtonRecording, true);
  assert.equal(uiState.showMetVisual, true);
});

test('getPiecePlaybackUiState disables metronome for other sections during demo', () => {
  const uiState = getPiecePlaybackUiState({
    mode: 'demo',
    sectionId: 'piece-a',
  }, 'piece-b');

  assert.equal(uiState.isDemo, false);
  assert.equal(uiState.isAnyDemo, true);
  assert.equal(uiState.playButtonText, '▶ 播放示范');
  assert.equal(uiState.metButtonText, '示范播放中');
  assert.equal(uiState.metButtonDisabled, true);
});

test('getStringsPlaybackUiState returns idle defaults', () => {
  const uiState = getStringsPlaybackUiState({
    mode: 'idle',
    sectionId: null,
    pitch: null,
  }, 'strings-a');

  assert.deepEqual(uiState, {
    isClickOnly: false,
    isAnyDemo: false,
    isReference: false,
    activePitch: null,
    metButtonText: '🔔 节拍器',
    metButtonDisabled: false,
    metButtonRecording: false,
  });
});

test('getStringsPlaybackUiState exposes the active reference pitch', () => {
  const uiState = getStringsPlaybackUiState({
    mode: 'reference',
    sectionId: 'strings-a',
    pitch: 'A4',
  }, 'strings-a');

  assert.equal(uiState.isReference, true);
  assert.equal(uiState.activePitch, 'A4');
  assert.equal(uiState.metButtonDisabled, false);
});

test('getStringsPlaybackUiState marks click-only mode for strings section', () => {
  const uiState = getStringsPlaybackUiState({
    mode: 'click',
    sectionId: 'strings-a',
    pitch: null,
  }, 'strings-a');

  assert.equal(uiState.isClickOnly, true);
  assert.equal(uiState.metButtonText, '⏹ 停止节拍器');
  assert.equal(uiState.metButtonRecording, true);
});

test('getStringsPlaybackUiState disables metronome while another section is demoing', () => {
  const uiState = getStringsPlaybackUiState({
    mode: 'demo',
    sectionId: 'piece-a',
    pitch: null,
  }, 'strings-a');

  assert.equal(uiState.isAnyDemo, true);
  assert.equal(uiState.isReference, false);
  assert.equal(uiState.metButtonText, '示范播放中');
  assert.equal(uiState.metButtonDisabled, true);
});
