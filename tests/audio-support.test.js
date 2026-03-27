import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSilentModeHintText,
  isAppleTouchDevice,
  shouldShowSilentModeHint,
} from '../js/audio-support.js';

test('detects classic iPhone/iPad user agents as Apple touch devices', () => {
  assert.equal(isAppleTouchDevice({
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)',
    platform: 'iPad',
    maxTouchPoints: 5,
  }), true);

  assert.equal(isAppleTouchDevice({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5,
  }), true);
});

test('detects iPadOS desktop-class Safari via Macintosh platform plus touch points', () => {
  assert.equal(isAppleTouchDevice({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  }), true);
});

test('does not show the silent mode hint on non-Apple desktop browsers', () => {
  const nav = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    platform: 'Win32',
    maxTouchPoints: 0,
  };

  assert.equal(isAppleTouchDevice(nav), false);
  assert.equal(shouldShowSilentModeHint(nav), false);
});

test('silent mode hint copy mentions mute mode and volume explicitly', () => {
  assert.match(getSilentModeHintText(), /静音模式/);
  assert.match(getSilentModeHintText(), /音量/);
});
