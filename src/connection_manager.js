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
    agent.runBeforeTransaction(this.confirmTransaction.bind(this));

    agent.once('handshake', async () => {
      if (this.syncingClients) {
        await this.syncEnd();
      }
      try {
        await syncDir(this.rootDir, agent);
        this.connections.add(agent);
      } catch (e) {
        console.error('Could not sync with client');
      }
    });

    agent.once('end', () => this.removeConnection(agent));
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
