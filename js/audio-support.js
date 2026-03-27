export function isAppleTouchDevice(nav = globalThis.navigator) {
  if (!nav) {
    return false;
  }

  const userAgent = nav.userAgent || '';
  const platform = nav.platform || '';
  const maxTouchPoints = Number(nav.maxTouchPoints || 0);

  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return true;
  }

  // iPadOS can report itself as Macintosh while still being a touch device.
  return /Mac/i.test(platform) && maxTouchPoints > 1;
}

export function shouldShowSilentModeHint(nav = globalThis.navigator) {
  return isAppleTouchDevice(nav);
}

export function getSilentModeHintText() {
  return '如果 iPad / iPhone 点了没声音，请先关闭静音模式，并确认媒体音量已打开。';
}
