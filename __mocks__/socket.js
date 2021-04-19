import { EventEmitter } from 'events';

export default class Socket extends EventEmitter {
  constructor() {
    super();
    this.setTimeout = jest.fn();
    this.end = jest.fn();
    this.write = jest.fn().mockImplementation((data, cb) => cb());
    this.pipe = jest.fn();
    this.unpipe = jest.fn();
    this.resume = jest.fn();
    this.on('error', () => this.emit('close'));
  }
}
