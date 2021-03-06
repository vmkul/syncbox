import { AsyncQueue, syncDir } from './util.js';
import Diff from './diff.js';
import { EventEmitter } from 'events';
import { Mutex } from 'async-mutex';
import { EXEC_END_TIMEOUT } from './constants.js';

const syncStages = {
  INIT_SYNC: 0,
  CLIENT_SYNC: 1,
  GLOBAL_SYNC: 2,
  NONE: null,
};

const asyncPromiseAll = async p => {
  while (p.length > 0) {
    try {
      await p.pop();
    } catch (e) {
      console.error(e);
    }
  }
};

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
      () => {},
      EXEC_END_TIMEOUT
    );
    this.agentDiff = new Map();
    this.curSyncStage = syncStages.NONE;
    this.syncStageMutex = new Mutex();
    this.parallelExecutors = [];
  }

  async addConnection(agent) {
    await this.setSyncStage(
      syncStages.INIT_SYNC,
      this._addConnection.bind(this, agent)
    );
  }

  async _addConnection(agent) {
    agent.runBeforeTransaction(this.queueTransaction.bind(this));
    await waitFor(agent, 'handshake');

    try {
      await syncDir(this.rootDir, agent);
      this.connections.add(agent);
    } catch (e) {
      console.log(e);
    }

    agent.once('end', () => this.removeConnection(agent));
  }

  async queueTransaction(agent) {
    return new Promise(resolve => {
      this.setSyncStage(
        syncStages.CLIENT_SYNC,
        this._queueTransaction.bind(this, agent, resolve)
      );
    });
  }

  async _queueTransaction(agent, startTransaction) {
    return new Promise(resolve => {
      let stopWaiting;
      const waitInLine = () => new Promise(resolve => (stopWaiting = resolve));

      const launchTransaction = () =>
        new Promise(resolve => {
          transaction(agent).then(resolve);
          stopWaiting();
        });

      this.transactionQueue.addTask(launchTransaction).then(() => {
        resolve();
        this.syncWithConnected();
      });

      waitInLine().then(startTransaction);

      agent.once('transaction_end', diff => this.agentDiff.set(agent, diff));
    });
  }

  async syncWithConnected() {
    await this.setSyncStage(
      syncStages.GLOBAL_SYNC,
      this._syncWithConnected.bind(this)
    );
  }

  async _syncWithConnected() {
    if (this.agentDiff.size === 0) {
      return;
    }

    const p = [];

    for (const agent of this.connections) {
      const agentPatch = new Diff();

      for (const [otherAgent, diff] of this.agentDiff.entries()) {
        if (otherAgent === agent) continue;
        agentPatch.mergeWith(diff);
      }

      if (!agentPatch.isEmpty()) {
        p.push(agentPatch.patchAgent(agent));
      }
    }

    await Promise.allSettled(p);
    this.agentDiff.clear();
  }

  removeConnection(agent) {
    this.connections.delete(agent);
  }

  async setSyncStage(stage, executor) {
    if (this.curSyncStage === stage && stage !== syncStages.GLOBAL_SYNC) {
      this.parallelExecutors.push(executor());
    } else {
      await this.syncStageMutex.runExclusive(async () => {
        this.curSyncStage = stage;
        try {
          await executor();
        } catch (e) {
          console.error(e);
        }
        await asyncPromiseAll(this.parallelExecutors);
        this.curSyncStage = syncStages.NONE;
        this.parallelExecutors = [];
      });
    }
  }
}

export default ConnectionManager;
