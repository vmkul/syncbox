import chokidar from 'chokidar';
import { Directory, File } from './dirtree.js';

class AsyncQueue {
  constructor(beforeExec, afterExec) {
    this.beforeExec = beforeExec;
    this.afterExec = afterExec;
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
    if (this.beforeExec) await this.beforeExec();
    while (this.queue.length !== 0) {
      const f = this.queue.shift();
      try {
        await f();
      } catch (e) {
        console.log(e);
      }
    }
    if (this.afterExec) await this.afterExec();
    this.executing = false;
  }
}

const syncDir = (dir, agent) =>
  new Promise(resolve => {
    const taskQueue = new AsyncQueue(
      agent.startTransaction.bind(agent),
      agent.endTransaction.bind(agent)
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
      .on('ready', async () => {
        await watcher.close();
        resolve();
      });
  });

export { syncDir, AsyncQueue };
