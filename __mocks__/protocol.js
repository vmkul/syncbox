import { EventEmitter } from 'events';

export default class Agent extends EventEmitter {
  constructor() {
    super();
    this.activeTransaction = false;
    this.isInTransaction = jest
      .fn()
      .mockImplementation(() => this.activeTransaction);
    this.runBeforeTransaction = jest
      .fn()
      .mockImplementation(f => (this.transactionChecker = f));
    this.startTransaction = jest
      .fn()
      .mockImplementation(
        () => this.transactionChecker && this.transactionChecker()
      );
    this.endTransaction = jest.fn();
    this.toggleTransaction = jest
      .fn()
      .mockImplementation(this.transactionChecker);
    this.sendFile = jest
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
    this.sendDir = jest.fn();
    this.sendUnlink = jest.fn();
    this.sendUnlinkDir = jest.fn().mockImplementation(() => {
      throw new Error();
    });
  }
}
