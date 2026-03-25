class Router {
  constructor() {
    this._routes = {};
    this._currentView = null;
    window.addEventListener('hashchange', () => this._resolve());
  }

  /** Register a route: pattern -> { init, show, hide } */
  register(pattern, handler) {
    this._routes[pattern] = handler;
  }

  /** Start routing */
  start() {
    this._resolve();
  }

  /** Navigate to a hash */
  navigate(hash) {
    location.hash = hash;
  }

  _resolve() {
    const hash = location.hash.slice(1) || '/';

    // Try exact match first
    if (this._routes[hash]) {
      this._activate(hash);
      return;
    }

    // Try pattern match (e.g., /exercise/:id)
    for (const pattern of Object.keys(this._routes)) {
      const params = this._matchPattern(pattern, hash);
      if (params) {
        this._activate(pattern, params);
        return;
      }
    }

    // Fallback to home
    location.hash = '#/';
  }

  _matchPattern(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');

    if (patternParts.length !== hashParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = hashParts[i];
      } else if (patternParts[i] !== hashParts[i]) {
        return null;
      }
    }
    return params;
  }

  _activate(pattern, params = {}) {
    // Hide current view
    if (this._currentView && this._routes[this._currentView]?.hide) {
      this._routes[this._currentView].hide();
    }

    // Show new view
    this._currentView = pattern;
    const handler = this._routes[pattern];
    if (handler.show) {
      handler.show(params);
    }
  }
}

export default Router;
