const INITIAL_STATE = Object.freeze({
  mode: 'idle',
  sectionId: null,
  pitch: null,
  bpm: null,
  beatsPerMeasure: 4,
});

export function createInitialPracticePlayerState() {
  return { ...INITIAL_STATE };
}

export function reducePracticePlayerState(state = createInitialPracticePlayerState(), action = {}) {
  switch (action.type) {
    case 'START_REFERENCE':
      return {
        mode: 'reference',
        sectionId: action.sectionId,
        pitch: action.pitch,
        bpm: null,
        beatsPerMeasure: 4,
      };
    case 'START_CLICK':
      return {
        mode: 'click',
        sectionId: action.sectionId,
        pitch: null,
        bpm: action.bpm,
        beatsPerMeasure: action.beatsPerMeasure || 4,
      };
    case 'START_DEMO':
      return {
        mode: 'demo',
        sectionId: action.sectionId,
        pitch: null,
        bpm: action.bpm,
        beatsPerMeasure: action.beatsPerMeasure || 4,
      };
    case 'STOP':
      return createInitialPracticePlayerState();
    default:
      return state;
  }
}
