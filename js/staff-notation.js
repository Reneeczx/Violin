import { buildPlaybackTimeline } from './score-utils.js';

const STAFF_LINE_GAP = 12;
const MEASURE_WIDTH = 184;
const FIRST_SYSTEM_HEADER_WIDTH = 92;
const OTHER_SYSTEM_HEADER_WIDTH = 24;
const SYSTEM_X = 24;
const SYSTEM_Y = 28;
const SYSTEM_HEIGHT = 172;
const SYSTEM_GAP = 28;
const MEASURE_PADDING_X = 18;
const MEASURE_BOX_PADDING_Y = 28;
const MEASURES_PER_ROW = 4;

const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function buildStaffModel(
  measures = [],
  {
    beatsPerMeasure = 4,
    bpm = 60,
    timeSignature = [4, 4],
    measuresPerRow = MEASURES_PER_ROW,
  } = {},
) {
  const timeline = buildPlaybackTimeline(measures, { beatsPerMeasure });
  const eventsByMeasure = groupEventsByMeasure(timeline.events, measures.length);
  const leadingRestBeats = timeline.events.find((event) => !event.isRest)?.startOffsetBeats || 0;
  const tokensById = {};

  const totalSystems = Math.max(1, Math.ceil(measures.length / measuresPerRow));
  const systems = Array.from({ length: totalSystems }, (_, systemIndex) => {
    const firstMeasureIndex = systemIndex * measuresPerRow;
    const systemMeasures = eventsByMeasure.slice(firstMeasureIndex, firstMeasureIndex + measuresPerRow);
    const headerWidth = systemIndex === 0 ? FIRST_SYSTEM_HEADER_WIDTH : OTHER_SYSTEM_HEADER_WIDTH;
    const topY = SYSTEM_Y + systemIndex * (SYSTEM_HEIGHT + SYSTEM_GAP);
    const lineYs = Array.from({ length: 5 }, (_, index) => topY + 34 + index * STAFF_LINE_GAP);

    const headerTokens = buildHeaderTokens({
      systemIndex,
      systemX: SYSTEM_X,
      headerWidth,
      lineYs,
      bpm,
      timeSignature,
    });
    headerTokens.forEach((token) => {
      tokensById[token.id] = token;
    });

    const renderedMeasures = systemMeasures.map((events, localIndex) => {
      const measureIndex = firstMeasureIndex + localIndex;
      const measureX = SYSTEM_X + headerWidth + localIndex * MEASURE_WIDTH;
      const noteAreaWidth = MEASURE_WIDTH - MEASURE_PADDING_X * 2;
      const beatWidth = noteAreaWidth / beatsPerMeasure;
      const staffTopY = lineYs[0];
      const boxY = staffTopY - MEASURE_BOX_PADDING_Y;
      const boxHeight = STAFF_LINE_GAP * 4 + MEASURE_BOX_PADDING_Y * 2;

      const tokens = events.map((event) => {
        const token = buildMeasureToken(event, {
          measureX,
          beatWidth,
          staffTopY,
          lineYs,
          leadingRestBeats,
        });
        tokensById[token.id] = token;
        return token;
      });

      const beatDots = Array.from({ length: beatsPerMeasure }, (_, beatIndex) => ({
        beatNumber: beatIndex + 1,
        cx: measureX + MEASURE_PADDING_X + beatWidth * beatIndex + beatWidth / 2,
        cy: staffTopY - 14,
        measureIndex,
      }));

      return {
        measureIndex,
        x: measureX,
        y: boxY,
        width: MEASURE_WIDTH,
        height: boxHeight,
        barLineX: measureX + MEASURE_WIDTH,
        lineYs,
        beatDots,
        tokens,
      };
    });

    return {
      systemIndex,
      topY,
      lineYs,
      headerTokens,
      measures: renderedMeasures,
      width: headerWidth + renderedMeasures.length * MEASURE_WIDTH,
      staffStartX: SYSTEM_X,
      staffEndX: SYSTEM_X + headerWidth + renderedMeasures.length * MEASURE_WIDTH,
    };
  });

  const maxWidth = Math.max(
    ...systems.map((system) => system.staffEndX + SYSTEM_X),
    SYSTEM_X + FIRST_SYSTEM_HEADER_WIDTH + MEASURE_WIDTH,
  );
  const totalHeight = systems.at(-1).lineYs.at(-1) + 62;

  return {
    bpm,
    timeSignature,
    beatsPerMeasure,
    systems,
    width: maxWidth,
    height: totalHeight,
    tokensById,
  };
}

function buildHeaderTokens({ systemIndex, systemX, headerWidth, lineYs, bpm, timeSignature }) {
  const headerCenterX = systemX + headerWidth / 2;
  const staffTopY = lineYs[0];
  const tokens = [];

  if (systemIndex === 0) {
    tokens.push({
      id: 'clef',
      tokenType: 'clef',
      topicId: 'staff-basics',
      x: systemX + 16,
      y: lineYs.at(-1) + 8,
      text: '𝄞',
    });
    tokens.push({
      id: 'time-signature',
      tokenType: 'time-signature',
      topicId: 'time-signature',
      x: headerCenterX - 2,
      topNumber: String(timeSignature[0] || 4),
      bottomNumber: String(timeSignature[1] || 4),
      topY: staffTopY + 18,
      bottomY: staffTopY + 42,
      timeSignature,
    });
    tokens.push({
      id: 'tempo',
      tokenType: 'tempo',
      topicId: 'tempo',
      x: systemX + headerWidth + 12,
      y: staffTopY - 16,
      text: `♩ = ${Math.round(bpm)}`,
      bpm,
    });
  }

  return tokens;
}

function buildMeasureToken(event, { measureX, beatWidth, staffTopY, lineYs, leadingRestBeats }) {
  const centerX = measureX + MEASURE_PADDING_X + beatWidth * (event.startBeat - 1 + event.beats / 2);
  if (event.isRest) {
    return buildRestToken(event, {
      centerX,
      staffTopY,
      lineYs,
      isLeadingRest: leadingRestBeats > 0 && event.endOffsetBeats <= leadingRestBeats,
    });
  }

  return buildNoteToken(event, {
    centerX,
    staffTopY,
    lineYs,
  });
}

function buildRestToken(event, { centerX, staffTopY, lineYs, isLeadingRest }) {
  return {
    id: `rest-${event.noteIndex}`,
    tokenType: 'rest',
    topicId: 'rests',
    noteIndex: event.noteIndex,
    measureIndex: event.measureIndex,
    pitch: event.pitch,
    pitchName: event.pitchName,
    duration: event.duration,
    beats: event.beats,
    x: centerX,
    y: staffTopY + STAFF_LINE_GAP * 2,
    lineYs,
    isLeadingRest,
  };
}

function buildNoteToken(event, { centerX, staffTopY, lineYs }) {
  const pitchName = event.pitch.replace(/\d/g, '');
  const pitchStep = getPitchStep(event.pitch);
  const y = staffTopY + STAFF_LINE_GAP * 4 - pitchStep * (STAFF_LINE_GAP / 2);
  const stemDirection = pitchStep >= 5 ? 'down' : 'up';
  const ledgerLineYs = getLedgerLineYs(pitchStep, staffTopY);

  return {
    id: `note-${event.noteIndex}`,
    tokenType: 'note',
    topicId: 'note-reading',
    noteIndex: event.noteIndex,
    measureIndex: event.measureIndex,
    pitch: event.pitch,
    pitchName,
    duration: event.duration,
    beats: event.beats,
    x: centerX,
    y,
    pitchStep,
    lineYs,
    ledgerLineYs,
    stemDirection,
    staffPositionLabel: getStaffPositionLabel(pitchStep),
  };
}

function groupEventsByMeasure(events, measureCount) {
  return Array.from({ length: measureCount }, (_, measureIndex) => {
    return events.filter((event) => event.measureIndex === measureIndex);
  });
}

function getPitchStep(pitch) {
  const match = /^([A-G])(#|b)?(\d)$/.exec(pitch || '');
  if (!match) {
    return 0;
  }

  const [, note, accidental, octaveText] = match;
  const octave = Number(octaveText);
  const diatonicIndex = octave * 7 + NOTE_ORDER.indexOf(note);
  const baseIndex = 4 * 7 + NOTE_ORDER.indexOf('E');
  const accidentalOffset = accidental === '#' ? 0.15 : accidental === 'b' ? -0.15 : 0;
  return diatonicIndex - baseIndex + accidentalOffset;
}

function getLedgerLineYs(step, staffTopY) {
  const lineYs = [];

  if (step < -1) {
    for (let current = -2; current >= Math.ceil(step); current -= 2) {
      lineYs.push(staffTopY + STAFF_LINE_GAP * 4 - current * (STAFF_LINE_GAP / 2));
    }
  }

  if (step > 8) {
    for (let current = 10; current <= Math.floor(step); current += 2) {
      lineYs.push(staffTopY + STAFF_LINE_GAP * 4 - current * (STAFF_LINE_GAP / 2));
    }
  }

  return lineYs;
}

function getStaffPositionLabel(step) {
  if (step >= 0 && step <= 8) {
    if (step % 2 === 0) {
      return `第 ${step / 2 + 1} 线`;
    }
    return `第 ${(step + 1) / 2} 间`;
  }

  if (step < 0) {
    const depth = Math.ceil(Math.abs(step) / 2);
    return step % 2 === 0 ? `下加 ${depth} 线` : `下加 ${depth} 间`;
  }

  const height = Math.ceil((step - 8) / 2);
  return step % 2 === 0 ? `上加 ${height} 线` : `上加 ${height} 间`;
}
