/** Simple pub/sub event bus */
const EventBus = {
  _listeners: {},

  on(event, callback) {
    (this._listeners[event] ||= []).push(callback);
  },

  off(event, callback) {
    const list = this._listeners[event];
    if (list) {
      this._listeners[event] = list.filter(cb => cb !== callback);
    }
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`EventBus [${event}]:`, e); }
    });
  }
};

export default EventBus;
