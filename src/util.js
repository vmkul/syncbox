import { Directory, File } from './dirtree.js';

const sendAllFilesInDir = async (dir, agent) => {
  for (const entry of dir.contents) {
    if (entry instanceof File) {
      await agent.sendFile(entry);
    }
  }
};

const syncDir = async (root, agent, isRootDir = true) => {
  if (!isRootDir) {
    await agent.sendDir(root);
  }
  await sendAllFilesInDir(root, agent);
  for (const entry of root.contents) {
    if (entry instanceof Directory) {
      await syncDir(entry, agent, false);
    }
  }
};

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

export { sendAllFilesInDir, syncDir, AsyncQueue };
