import { AsyncQueue, syncDir } from './util.js';
import Diff from './diff.js';
import { EventEmitter } from 'events';
import { EXEC_END_TIMEOUT } from './constants.js';

const transaction = agent =>
  new Promise(resolve => {
    agent.once('transaction_end', diff => {
      console.log(diff);
      resolve();
    });
  });

const waitFor = (ee, event) =>
  new Promise(resolve => {
    ee.once(event, resolve);
  });

class ConnectionManager extends EventEmitter {
  constructor(rootDir) {
    super();
    this.rootDir = rootDir;
    this.connections = new Set();
    this.transactionQueue = new AsyncQueue(
      () => {},
      () => this.syncWithConnected(),
      EXEC_END_TIMEOUT
    );
    this.syncingClients = false;
    this.transactionDiff = new Diff();
  }

  async addConnection(agent) {
    agent.runBeforeTransaction(this.queueTransaction.bind(this));
    await waitFor(agent, 'handshake');

    if (this.syncingClients) {
      await this.syncEnd();
    }

    try {
      await syncDir(this.rootDir, agent);
      this.connections.add(agent);
    } catch (e) {
      console.log(e);
    }

    agent.once('end', () => this.removeConnection(agent));
  }

  async queueTransaction(agent) {
    if (this.syncingClients) {
      await this.syncEnd();
    }

    let stopWaiting;
    const waitInLine = () => new Promise(resolve => (stopWaiting = resolve));

    const launchTransaction = async () => {
      stopWaiting();
      await transaction(agent);
    };

    this.transactionQueue.addTask(launchTransaction).then();

    await waitInLine();

    agent.once('transaction_end', diff => this.transactionDiff.mergeWith(diff));
  }

  async syncWithConnected() {
    this.syncingClients = true;
    const p = [];

    for (const agent of this.connections) {
      p.push(this.transactionDiff.patchAgent(agent));
    }

    await Promise.allSettled(p);

    this.transactionDiff = new Diff();
    this.syncingClients = false;
    this.emit('global_sync_end');
  }

  removeConnection(agent) {
    this.connections.delete(agent);
  }

  syncEnd() {
    return new Promise(resolve => {
      this.once('global_sync_end', resolve);
    });
  }
}

export default ConnectionManager;
