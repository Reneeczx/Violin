const DEFAULT_OPEN_STRINGS = Object.freeze([
  { name: 'E', pitch: 'E5', freq: 659.25, solfege: 'Mi', color: '#E74C3C', order: 1 },
  { name: 'A', pitch: 'A4', freq: 440.0, solfege: 'La', color: '#E8913A', order: 2 },
  { name: 'D', pitch: 'D4', freq: 293.66, solfege: 'Re', color: '#5B8DBE', order: 3 },
  { name: 'G', pitch: 'G3', freq: 196.0, solfege: 'Sol', color: '#6BBF59', order: 4 },
]);

const DEFAULT_BY_PITCH = new Map(DEFAULT_OPEN_STRINGS.map((item) => [item.pitch, item]));
const DEFAULT_BY_NAME = new Map(DEFAULT_OPEN_STRINGS.map((item) => [item.name, item]));

export function getDefaultOpenStrings() {
  return DEFAULT_OPEN_STRINGS.map((item) => ({ ...item }));
}

export function getOpenStrings(lesson = globalThis.window?.CURRENT_LESSON) {
  const configuredStrings = lesson?.exercises?.find((exercise) => exercise.type === 'open-strings')?.strings;
  const source = Array.isArray(configuredStrings) && configuredStrings.length
    ? configuredStrings
    : DEFAULT_OPEN_STRINGS;

  return source.map((stringData, index) => {
    const fallback = DEFAULT_BY_PITCH.get(stringData.pitch)
      || DEFAULT_BY_NAME.get(stringData.name)
      || DEFAULT_OPEN_STRINGS[index]
      || {};

    return {
      ...fallback,
      ...stringData,
      order: stringData.order || fallback.order || index + 1,
      freq: stringData.freq || fallback.freq || null,
    };
  });
}
