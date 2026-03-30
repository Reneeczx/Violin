/**
 * ============================
 *   历史课程归档
 *   保留已上完课周的正式作业数据
 * ============================
 */
window.LESSON_ARCHIVE = [
  {
    id: 'lesson-000',
    weekOf: '2026-03-16',
    lessonDay: 1,
    title: '课前准备 - 持琴与空弦',
    titleEn: 'Prep Week - Posture and Open Strings',
    teacherNotes: '先站稳、再发声。弓子走直，拉长音时不要急着换弓。',

    exercises: [
      {
        id: 'ex-open-strings-prep',
        type: 'open-strings',
        title: '空弦预备练习',
        titleEn: 'Open Strings Prep',
        description: '先从 A 弦和 D 弦开始，听清楚长音是否稳定，再补上 E 弦和 G 弦。',
        strings: [
          { name: 'E', pitch: 'E5', solfege: 'Mi', color: '#E74C3C' },
          { name: 'A', pitch: 'A4', solfege: 'La', color: '#E8913A' },
          { name: 'D', pitch: 'D4', solfege: 'Re', color: '#5B8DBE' },
          { name: 'G', pitch: 'G3', solfege: 'Sol', color: '#6BBF59' },
        ],
        beatsPerString: 4,
        bpm: 56,
        estimatedMinutes: 3,
        progression: {
          day1: { bpm: 48, focus: '只练 A 弦和 D 弦，每根弦拉 4 个长弓。' },
          day2: { bpm: 50, focus: '加入 E 弦，听弓子是不是一直贴着弦走。' },
          day3: { bpm: 52, focus: '四根空弦都轮一遍，同时唱音名。' },
          day4: { bpm: 52, focus: '闭眼拉长音，只听音色有没有突然变薄。' },
          day5: { bpm: 56, focus: 'A -> D -> A -> D 来回换弦，动作先慢一点。' },
          day6: { bpm: 58, focus: '四根空弦顺序轮换，不在换弓处停住。' },
          day7: { bpm: 56, focus: '把四根空弦完整拉一遍，准备下周继续加曲子。' },
        },
      },
      {
        id: 'ex-rhythm-call',
        type: 'piece',
        title: 'Rhythm Echo',
        titleEn: 'Rhythm Echo',
        description: '先数拍，再拉音。重点是看懂 4/4 和休止，不追求快。',
        timeSignature: [4, 4],
        bpm: 64,
        estimatedMinutes: 5,
        playModes: ['arco'],
        measures: [
          { notes: [{ pitch: 'REST', duration: 'half' }, { pitch: 'D4', duration: 'quarter' }, { pitch: 'D4', duration: 'quarter' }] },
          { notes: [{ pitch: 'A4', duration: 'half' }, { pitch: 'REST', duration: 'half' }] },
          { notes: [{ pitch: 'A4', duration: 'quarter' }, { pitch: 'A4', duration: 'quarter' }, { pitch: 'D4', duration: 'half' }] },
          { notes: [{ pitch: 'REST', duration: 'whole' }] },
        ],
        progression: {
          day1: { bpmFactor: 0.5, mode: 'arco', focus: '先数 1 2 3 4，再拉第一小节。' },
          day2: { bpmFactor: 0.55, mode: 'arco', focus: '休止时不要抢拍，等高亮走到音符再进。' },
          day3: { bpmFactor: 0.6, mode: 'arco', focus: '把第二小节的长音拉满 2 拍。' },
          day4: { bpmFactor: 0.6, mode: 'arco', focus: '四小节连起来拉，但速度继续放慢。' },
          day5: { bpmFactor: 0.7, mode: 'arco', focus: '注意休止和发音的边界，别连在一起。' },
          day6: { bpmFactor: 0.8, mode: 'arco', focus: '跟着节拍器完整拉一遍。' },
          day7: { bpmFactor: 1, mode: 'arco', focus: '按原速复习，确认自己看谱不会迷路。' },
        },
      },
    ],
  },
  {
    id: 'lesson-prep-001',
    weekOf: '2026-03-09',
    lessonDay: 1,
    title: '准备周 - 弓子、节拍与休止',
    titleEn: 'Prep Week - Bowing, Beat, and Rest',
    teacherNotes: '这一周重点是知道什么时候该发声，什么时候该安静数拍。',

    exercises: [
      {
        id: 'ex-bow-balance',
        type: 'open-strings',
        title: '弓子平衡练习',
        titleEn: 'Bow Balance',
        description: '每根空弦只拉短短两拍，观察右手有没有突然发力。',
        strings: [
          { name: 'E', pitch: 'E5', solfege: 'Mi', color: '#E74C3C' },
          { name: 'A', pitch: 'A4', solfege: 'La', color: '#E8913A' },
          { name: 'D', pitch: 'D4', solfege: 'Re', color: '#5B8DBE' },
          { name: 'G', pitch: 'G3', solfege: 'Sol', color: '#6BBF59' },
        ],
        beatsPerString: 2,
        bpm: 52,
        estimatedMinutes: 3,
        progression: {
          day1: { bpm: 46, focus: '每根弦只拉两拍，先让发音干净。' },
          day2: { bpm: 48, focus: '注意换弓时不要抬肩。' },
          day3: { bpm: 50, focus: '加入唱音名，耳朵和手一起工作。' },
          day4: { bpm: 50, focus: 'E 弦和 G 弦的音色对比一下。' },
          day5: { bpm: 52, focus: '四根弦轮换，动作保持一样大。' },
          day6: { bpm: 54, focus: '听节拍器，每拍都在正点上开始。' },
          day7: { bpm: 52, focus: '完整复习，准备进入真正的第一课。' },
        },
      },
      {
        id: 'ex-rest-count',
        type: 'piece',
        title: 'Count the Rest',
        titleEn: 'Count the Rest',
        description: '这段小谱子只有几个音，重点是先看见休止再进拍。',
        timeSignature: [4, 4],
        bpm: 60,
        estimatedMinutes: 4,
        playModes: ['pizzicato', 'arco'],
        measures: [
          { notes: [{ pitch: 'REST', duration: 'whole' }] },
          { notes: [{ pitch: 'REST', duration: 'half' }, { pitch: 'A4', duration: 'quarter' }, { pitch: 'A4', duration: 'quarter' }] },
          { notes: [{ pitch: 'D4', duration: 'quarter' }, { pitch: 'REST', duration: 'quarter' }, { pitch: 'D4', duration: 'half' }] },
          { notes: [{ pitch: 'G3', duration: 'quarter' }, { pitch: 'G3', duration: 'quarter' }, { pitch: 'REST', duration: 'half' }] },
        ],
        progression: {
          day1: { bpmFactor: 0.5, mode: 'pizzicato', focus: '先拨弦，重点是把整小节休止数完整。' },
          day2: { bpmFactor: 0.55, mode: 'pizzicato', focus: '看到休止时嘴里继续数拍。' },
          day3: { bpmFactor: 0.6, mode: 'pizzicato', focus: '把第二小节和第三小节接起来。' },
          day4: { bpmFactor: 0.55, mode: 'arco', focus: '换成拉弓，但休止还是一样要数。' },
          day5: { bpmFactor: 0.65, mode: 'arco', focus: '让每个音都在正确拍点出现。' },
          day6: { bpmFactor: 0.8, mode: 'both', focus: '先拨再拉，对照两种演奏方式。' },
          day7: { bpmFactor: 1, mode: 'both', focus: '原速复习，确认自己能看懂休止。' },
        },
      },
    ],
  },
];
