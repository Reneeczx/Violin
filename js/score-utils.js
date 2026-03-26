const DURATION_BEATS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

const GRID_UNITS_PER_BEAT = 4;

export function getDurationBeats(duration) {
  return DURATION_BEATS[duration] || 1;
}

function collectMeasureEntries(measures = []) {
  let noteIndex = 0;
  let globalBeatCursor = 0;

  return measures.map((measure, measureIndex) => {
    let measureBeatCursor = 0;

    const cells = (measure.notes || []).map((note, measureNoteIndex) => {
      const beats = getDurationBeats(note.duration);
      const cell = {
        noteIndex,
        measureNoteIndex,
        measureIndex,
        beats,
        duration: note.duration,
        pitch: note.pitch,
        isRest: note.pitch === 'REST',
        pitchName: note.pitch === 'REST' ? '-' : note.pitch.replace(/\d/g, ''),
        startBeat: measureBeatCursor + 1,
        startOffsetBeats: globalBeatCursor,
        endOffsetBeats: globalBeatCursor + beats,
        spanUnits: Math.max(1, Math.round(beats * GRID_UNITS_PER_BEAT)),
      };

      measureBeatCursor += beats;
      globalBeatCursor += beats;
      noteIndex += 1;
      return cell;
    });

    return {
      measureIndex,
      totalBeats: measureBeatCursor,
      cells,
    };
  });
}

export function getTotalBeats(measures = []) {
  return collectMeasureEntries(measures).reduce((sum, measure) => {
    return sum + measure.cells.reduce((noteSum, cell) => noteSum + cell.beats, 0);
  }, 0);
}

export function buildPlaybackTimeline(measures = [], { beatsPerMeasure = 4 } = {}) {
  const measuresWithCells = collectMeasureEntries(measures);
  const events = measuresWithCells.flatMap((measure) => {
    return measure.cells.map((cell) => ({
      noteIndex: cell.noteIndex,
      measureNoteIndex: cell.measureNoteIndex,
      measureIndex: cell.measureIndex,
      beats: cell.beats,
      duration: cell.duration,
      pitch: cell.pitch,
      pitchName: cell.pitchName,
      isRest: cell.isRest,
      startBeat: cell.startBeat,
      startOffsetBeats: cell.startOffsetBeats,
      endOffsetBeats: cell.endOffsetBeats,
    }));
  });

  return {
    beatsPerMeasure,
    totalBeats: events.at(-1)?.endOffsetBeats || 0,
    totalMeasures: measuresWithCells.length,
    events,
  };
}

export function buildScoreModel(measures = [], { beatsPerMeasure = 4 } = {}) {
  const gridUnits = beatsPerMeasure * GRID_UNITS_PER_BEAT;

  return collectMeasureEntries(measures).map((measure) => {
    const beatLabels = Array.from({ length: beatsPerMeasure }, (_, index) => ({
      beatNumber: index + 1,
      gridColumnStart: index * GRID_UNITS_PER_BEAT + 1,
      gridColumnSpan: GRID_UNITS_PER_BEAT,
    }));

    return {
      measureIndex: measure.measureIndex,
      beatsPerMeasure,
      gridUnits,
      beatLabels,
      cells: measure.cells.map((cell) => ({
        noteIndex: cell.noteIndex,
        measureIndex: cell.measureIndex,
        beats: cell.beats,
        duration: cell.duration,
        isRest: cell.isRest,
        pitchName: cell.pitchName,
        startBeat: cell.startBeat,
        spanUnits: cell.spanUnits,
      })),
    };
  });
}
