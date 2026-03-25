/**
 * ============================
 *   本周课程数据
 *   每周上完课后更新此文件
 * ============================
 */
window.CURRENT_LESSON = {
  id: "lesson-001",
  weekOf: "2026-03-23",       // 本周起始日 (上课日)
  lessonDay: 1,                // 周几上课 (1=周一, 7=周日)
  title: "第一课 - 认识空弦",
  titleEn: "Lesson 1 - Open Strings",
  teacherNotes: "注意握弓姿势，弓要走直。站姿要端正。",

  exercises: [
    // ---- 练习1: 空弦练习 ----
    {
      id: "ex-open-strings",
      type: "open-strings",
      title: "四根空弦练习",
      titleEn: "Open Strings",
      description: "依次拉每根弦，拉的同时唱出音名。从高到低：E(Mi), A(La), D(Re), G(Sol)",
      strings: [
        { name: "E", pitch: "E5", solfege: "Mi", color: "#E74C3C" },
        { name: "A", pitch: "A4", solfege: "La", color: "#E8913A" },
        { name: "D", pitch: "D4", solfege: "Re", color: "#5B8DBE" },
        { name: "G", pitch: "G3", solfege: "Sol", color: "#6BBF59" }
      ],
      beatsPerString: 4,
      bpm: 60,
      estimatedMinutes: 3,
      progression: {
        day1: { bpm: 50, focus: "每根弦拉4个长弓，感受弓的重量和琴弦的振动" },
        day2: { bpm: 55, focus: "注意弓走直，看弓和琴桥是否保持平行" },
        day3: { bpm: 55, focus: "加入唱音名：E弦唱Mi，A弦唱La，D弦唱Re，G弦唱Sol" },
        day4: { bpm: 60, focus: "闭上眼睛拉，听音色是否均匀饱满" },
        day5: { bpm: 60, focus: "练习换弦：E→A→D→G，过弦要平稳" },
        day6: { bpm: 65, focus: "G→D→A→E→E→A→D→G 来回拉，不停顿" },
        day7: { bpm: 60, focus: "复习所有空弦，准备下次课展示给老师" }
      }
    },

    // ---- 练习2: Trick or Treat ----
    {
      id: "ex-trick-or-treat",
      type: "piece",
      title: "Trick or Treat",
      titleEn: "Trick or Treat",
      description: "第一遍拨弦 (pizzicato)，第二遍拉弓 (arco)。标记 Ghostly，像幽灵一样神秘地演奏。",
      timeSignature: [4, 4],
      bpm: 80,
      estimatedMinutes: 5,
      playModes: ["pizzicato", "arco"],
      measures: [
        // 第1-3小节: 全休止
        { notes: [{ pitch: "REST", duration: "whole" }] },
        { notes: [{ pitch: "REST", duration: "whole" }] },
        { notes: [
          { pitch: "REST", duration: "half" },
          { pitch: "G3", duration: "quarter" },
          { pitch: "G3", duration: "quarter" }
        ]},
        // 第4小节
        { notes: [
          { pitch: "D4", duration: "quarter" },
          { pitch: "D4", duration: "quarter" },
          { pitch: "A4", duration: "quarter" },
          { pitch: "A4", duration: "quarter" }
        ]},
        // 第5小节 (第二行开始)
        { notes: [
          { pitch: "E5", duration: "quarter" },
          { pitch: "E5", duration: "quarter" },
          { pitch: "REST", duration: "half" }
        ]},
        // 第6小节
        { notes: [
          { pitch: "E5", duration: "quarter" },
          { pitch: "E5", duration: "quarter" },
          { pitch: "A4", duration: "quarter" },
          { pitch: "A4", duration: "quarter" }
        ]},
        // 第7小节
        { notes: [
          { pitch: "D4", duration: "quarter" },
          { pitch: "D4", duration: "quarter" },
          { pitch: "G3", duration: "quarter" },
          { pitch: "G3", duration: "quarter" }
        ]},
      ],
      progression: {
        day1: { bpmFactor: 0.5, mode: "pizzicato", focus: "只拨弦，先熟悉音符的顺序" },
        day2: { bpmFactor: 0.5, mode: "pizzicato", focus: "拨弦练习，跟着节拍器保持节奏稳定" },
        day3: { bpmFactor: 0.6, mode: "pizzicato", focus: "拨弦提速，尝试边拨边唱音名" },
        day4: { bpmFactor: 0.5, mode: "arco", focus: "开始用弓拉，速度放慢，注意换弦动作" },
        day5: { bpmFactor: 0.65, mode: "arco", focus: "拉弓提速，保持弓走直" },
        day6: { bpmFactor: 0.8, mode: "both", focus: "先拨弦一遍，再拉弓一遍，完整演奏" },
        day7: { bpmFactor: 1.0, mode: "both", focus: "原速完整演奏，像表演一样自信地拉" }
      }
    }
  ]
};
