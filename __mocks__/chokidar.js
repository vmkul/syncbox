import { EventEmitter } from 'events';

export default {
  ee: new EventEmitter(),
  watch() {
    return this.ee;
  },
};
