import State from './state.js';
import EventBus from './event-bus.js';

const Tracking = {
  /**
   * Mark a section as completed/uncompleted for today.
   */
  toggleSection(weekOf, dayNumber, sectionId) {
    const data = State.getWeekTracking(weekOf);
    if (!data.days[dayNumber]) {
      data.days[dayNumber] = {
        date: new Date().toISOString().split('T')[0],
        sections: {},
        totalSeconds: 0,
        completedAt: null,
      };
    }
    const day = data.days[dayNumber];
    const wasCompleted = day.sections[sectionId]?.completed;
    day.sections[sectionId] = { completed: !wasCompleted };

    State.saveWeekTracking(weekOf, data);
    EventBus.emit('section:toggle', { weekOf, dayNumber, sectionId, completed: !wasCompleted });
    return !wasCompleted;
  },

  /**
   * Check if a section is completed.
   */
  isSectionCompleted(weekOf, dayNumber, sectionId) {
    const data = State.getWeekTracking(weekOf);
    return data.days[dayNumber]?.sections[sectionId]?.completed || false;
  },

  /**
   * Check if all sections of a day are completed.
   */
  isDayCompleted(weekOf, dayNumber, sectionIds) {
    const data = State.getWeekTracking(weekOf);
    const day = data.days[dayNumber];
    if (!day) return false;
    return sectionIds.every(id => day.sections[id]?.completed);
  },

  /**
   * Mark the day as practiced and update stats.
   */
  markDayPracticed(weekOf, dayNumber, totalSeconds) {
    const data = State.getWeekTracking(weekOf);
    if (!data.days[dayNumber]) {
      data.days[dayNumber] = { date: new Date().toISOString().split('T')[0], sections: {} };
    }
    data.days[dayNumber].totalSeconds = totalSeconds;
    data.days[dayNumber].completedAt = new Date().toISOString();
    State.saveWeekTracking(weekOf, data);

    // Update global stats
    this._updateStats(totalSeconds);
    EventBus.emit('day:complete', { weekOf, dayNumber });
  },

  _updateStats(seconds) {
    const stats = State.getStats();
    const today = new Date().toISOString().split('T')[0];

    if (stats.lastPracticeDate !== today) {
      stats.totalPracticeDays++;

      // Check streak
      const lastDate = stats.lastPracticeDate ? new Date(stats.lastPracticeDate) : null;
      const todayDate = new Date(today);
      if (lastDate) {
        const diffDays = Math.floor((todayDate - lastDate) / 86400000);
        if (diffDays === 1) {
          stats.currentStreak++;
        } else if (diffDays > 1) {
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }

      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastPracticeDate = today;
    }

    stats.totalPracticeMinutes += Math.round(seconds / 60);
    State.saveStats(stats);
  },

  /**
   * Get completed day numbers for a week.
   */
  hasWeekRecord(weekOf) {
    return State.hasWeekTracking(weekOf);
  },

  /**
   * Get completed day numbers for a week.
   */
  getCompletedDays(weekOf) {
    const data = State.getWeekTracking(weekOf);
    return Object.keys(data.days)
      .filter(d => data.days[d].completedAt)
      .map(Number);
  },

  /**
   * Get practice summary for a day.
   */
  getDaySummary(weekOf, dayNumber) {
    const data = State.getWeekTracking(weekOf);
    return data.days[dayNumber] || null;
  }
};

export default Tracking;
