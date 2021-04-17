export default class EventDispatcher {
  constructor() {
    this.eventCount = new Map();
    this.eventWaiters = new Map();
  }

  registerEvent(event) {
    if (
      this.eventWaiters.has(event) &&
      this.eventWaiters.get(event).length > 0
    ) {
      this._executeResolver(event);
    } else {
      this._incrementEvent(event);
    }
  }

  _executeResolver(event) {
    const resolvers = this.eventWaiters.get(event);
    const first = resolvers.shift();
    first();
  }

  _incrementEvent(event) {
    if (!this.eventCount.has(event)) {
      this.eventCount.set(event, 1);
    } else {
      const total = this.eventCount.get(event);
      this.eventCount.set(event, total + 1);
    }
  }

  waitEvent(event) {
    return new Promise(resolve => {
      if (this.eventCount.get(event) > 0) {
        this._decrementEvent(event);
        resolve();
      } else if (this.eventWaiters.has(event)) {
        this.eventWaiters.get(event).push(resolve);
      } else {
        this.eventWaiters.set(event, [resolve]);
      }
    });
  }

  _decrementEvent(event) {
    const total = this.eventCount.get(event);
    this.eventCount.set(event, total - 1);
  }
}
