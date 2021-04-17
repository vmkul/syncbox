import chokidar from 'chokidar';
import { Directory, File } from './dirtree.js';
import { readdir } from 'fs/promises';
import { EXEC_END_TIMEOUT } from './constants.js';

class AsyncQueue {
  constructor(beforeExec, afterExec, execEndTimeout) {
    this.beforeExec = beforeExec;
    this.afterExec = afterExec;
    this.execEndTimeout = execEndTimeout;
    this.queue = [];
    this.executing = false;
  }

  async addTask(func) {
    this.queue.push(func);
    console.log('Queue length: ' + this.queue.length);
    if (!this.executing) {
      await this.startExecution();
    }
  }

  async startExecution() {
    this.executing = true;
    if (this.beforeExec) {
      try {
        await this.beforeExec();
      } catch (e) {
        console.error(e);
      }
    }

    while (this.queue.length !== 0) {
      const f = this.queue.shift();

      try {
        await f();
      } catch (e) {
        console.log(e);
      }

      if (this.execEndTimeout && this.queue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, this.execEndTimeout));
      }
    }

    if (this.afterExec) {
      try {
        await this.afterExec();
      } catch (e) {
        console.error(e);
      }
    }
    this.executing = false;
  }
}

const isDirEmpty = async path => {
  const contents = await readdir(path);
  return contents.length === 0;
};

const syncDir = (dir, agent) =>
  new Promise((resolve, reject) => {
    agent.once('end', reject);
    isDirEmpty(dir.getFullPath())
      .then(isEmpty => {
        if (isEmpty) resolve();
      })
      .catch(reject);

    const taskQueue = new AsyncQueue(
      agent.startTransaction.bind(agent),
      async () => {
        await agent.endTransaction();
        resolve();
      },
      EXEC_END_TIMEOUT
    );

    const watcher = chokidar
      .watch(dir.getFullPath())
      .on('add', path =>
        taskQueue.addTask(agent.sendFile.bind(agent, new File(path)))
      )
      .on('addDir', async path => {
        if (path === dir.getFullPath()) {
          return;
        }
        await taskQueue.addTask(agent.sendDir.bind(agent, new Directory(path)));
      })
      .on('error', reject)
      .on('ready', async () => {
        await watcher.close();
      });
  });

const exitOnError = errMsg => {
  process.exitCode = 1;
  throw new Error(errMsg);
};

export { syncDir, AsyncQueue, exitOnError };
