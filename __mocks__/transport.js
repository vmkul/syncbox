import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

export default class Messenger extends EventEmitter {
  constructor() {
    super();
    this.sendMessage = jest.fn();
    this.getFile = jest.fn();
    this.sendFile = jest.fn();
    this.closeConnection = jest
      .fn()
      .mockImplementation(() => this.emit('close'));
    this.setTimeout = jest.fn().mockImplementation(() => {
      this.timeout = setTimeout(() => this.emit('close'), 100);
    });
    this.clearTimeout = jest.fn().mockImplementation(() => {
      clearTimeout(this.timeout);
    });
  }
}
