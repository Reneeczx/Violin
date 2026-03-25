const PREFIX = 'vp_';

const State = {
  save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('State.save error:', e);
    }
  },

  load(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error('State.load error:', e);
      return defaultValue;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /** Get or create tracking data for a specific week */
  getWeekTracking(weekOf) {
    return this.load(`tracking_${weekOf}`, {
      weekOf,
      days: {}
    });
  },

  saveWeekTracking(weekOf, data) {
    this.save(`tracking_${weekOf}`, data);
  },

  /** Get global stats */
  getStats() {
    return this.load('stats', {
      totalPracticeDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalPracticeMinutes: 0,
      lastPracticeDate: null
    });
  },

  saveStats(stats) {
    this.save('stats', stats);
  },

  /** Get settings */
  getSettings() {
    return this.load('settings', {
      metronomeVolume: 0.7,
      referenceVolume: 0.8,
      preferredSpeed: 1.0
    });
  },

  saveSettings(settings) {
    this.save('settings', settings);
  }
};

export default State;
