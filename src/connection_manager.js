import { AsyncQueue, syncDir } from './util.js';
import Diff from './diff.js';
import { EventEmitter } from 'events';

const EXEC_END_TIMEOUT = 1000;

const transaction = async agent =>
  new Promise(resolve => {
    agent.once('transaction_end', diff => {
      console.log(diff);
      resolve();
    });
  });

class ConnectionManager extends EventEmitter {
  constructor(rootDir) {
    super();
    this.rootDir = rootDir;
    this.connections = new Set();
    this.transactionQueue = new AsyncQueue(
      () => {},
      this.syncWithConnected.bind(this),
      EXEC_END_TIMEOUT
    );
    this.syncingClients = false;
    this.transactionDiff = new Diff();
  }

  async addConnection(agent) {
    agent.runBeforeTransaction(this.confirmTransaction.bind(this));
    agent.on('handshake', () => {
      syncDir(this.rootDir, agent);
      this.connections.add(agent);
    });
    agent.on('end', () => this.removeConnection(agent));
  }

  async confirmTransaction(agent) {
    if (this.syncingClients) {
      await this.syncEnd();
    }
    agent.once('transaction_end', diff => this.transactionDiff.mergeWith(diff));
    this.transactionQueue.addTask(() => transaction(agent)).then();
  }

  async syncWithConnected() {
    this.syncingClients = true;
    const p = [];

    for (const agent of this.connections) {
      p.push(this.transactionDiff.applyChanges(agent));
    }

    await Promise.all(p);

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
