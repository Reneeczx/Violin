import EventBus from './event-bus.js';

class Timer {
  constructor() {
    this._intervalId = null;
    this._startTime = 0;
    this._elapsed = 0; // seconds
    this._running = false;
  }

  get running() { return this._running; }
  get elapsed() { return this._elapsed; }

  start() {
    if (this._running) return;
    this._running = true;
    this._startTime = Date.now() - this._elapsed * 1000;
    this._intervalId = setInterval(() => {
      this._elapsed = Math.floor((Date.now() - this._startTime) / 1000);
      EventBus.emit('timer:tick', this._elapsed);
    }, 1000);
    EventBus.emit('timer:start', this._elapsed);
  }

  pause() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._intervalId);
    EventBus.emit('timer:pause', this._elapsed);
  }

  reset() {
    this.pause();
    this._elapsed = 0;
    EventBus.emit('timer:reset', 0);
  }

  toggle() {
    if (this._running) this.pause();
    else this.start();
  }
}

export default new Timer();
