import chokidar from 'chokidar';
import { Directory, File } from './dirtree.js';
import { open } from 'fs/promises';
import { AsyncQueue } from './util.js';
import { EXEC_END_TIMEOUT } from './constants.js';

class Watcher {
  constructor(dirPath, agent) {
    this.dirPath = dirPath;
    this.agent = agent;
    this.taskQueue = new AsyncQueue(
      agent.startTransaction.bind(agent),
      agent.endTransaction.bind(agent),
      EXEC_END_TIMEOUT
    );

    const fsWatcher = chokidar.watch(this.dirPath).on('ready', () => {
      const onAddOrChange = async path => {
        if (!this.agent.isInTransaction()) {
          await this.taskQueue.addTask(this.changeHandler.bind(this, path));
        }
      };

      fsWatcher
        .on('add', onAddOrChange)
        .on('change', onAddOrChange)
        .on('unlink', async path => {
          if (!this.agent.isInTransaction()) {
            await this.taskQueue.addTask(this.unlinkHandler.bind(this, path));
          }
        })
        .on('addDir', async path => {
          if (!this.agent.isInTransaction()) {
            await this.taskQueue.addTask(this.addDirHandler.bind(this, path));
          }
        })
        .on('unlinkDir', async path => {
          if (!this.agent.isInTransaction()) {
            await this.taskQueue.addTask(
              this.unlinkDirHandler.bind(this, path)
            );
          }
        })
        .on('error', e => this.errorHandler(e));
    });
  }

  async changeHandler(filePath) {
    if (!(await this.checkIfAccessible(filePath))) {
      return;
    }
    await this.agent.sendFile(new File(filePath));
  }

  async unlinkHandler(filePath) {
    await this.agent.sendUnlink(new File(filePath));
  }

  async addDirHandler(dirPath) {
    await this.agent.sendDir(new Directory(dirPath));
  }

  async unlinkDirHandler(dirPath) {
    await this.agent.sendUnlinkDir(new Directory(dirPath));
  }

  async errorHandler() {}

  async checkIfAccessible(path) {
    if (!path) return false;

    try {
      const fileHandle = await open(path);
      await fileHandle.close();
      return true;
    } catch (e) {
      console.log('There was an error opening: ' + e);
      return false;
    }
  }
}

export default Watcher;
