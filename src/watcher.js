import chokidar from 'chokidar';
import { Directory, File } from './dirtree.js';
import { access } from 'fs';
import { AsyncQueue } from './util.js';

class Watcher {
  constructor(dirPath, agent) {
    this.dirPath = dirPath;
    this.agent = agent;
    this.taskQueue = new AsyncQueue(
      agent.startTransaction.bind(agent),
      agent.endTransaction.bind(agent)
    );

    const fsWatcher = chokidar.watch(this.dirPath).on('ready', () => {
      fsWatcher
        .on('add', path =>
          this.taskQueue.addTask(this.changeHandler.bind(this, path))
        )
        .on('change', path =>
          this.taskQueue.addTask(this.changeHandler.bind(this, path))
        )
        .on('unlink', path =>
          this.taskQueue.addTask(this.unlinkHandler.bind(this, path))
        )
        .on('addDir', path =>
          this.taskQueue.addTask(this.addDirHandler.bind(this, path))
        )
        .on('unlinkDir', path =>
          this.taskQueue.addTask(this.unlinkDirHandler.bind(this, path))
        )
        .on('error', e =>
          this.taskQueue.addTask(this.errorHandler.bind(this, e))
        )
        .on('all', (action, path) => console.log(path));
    });
  }

  async changeHandler(filePath) {
    if (!(await this.checkIfExists(filePath))) {
      return;
    }
    await this.agent.sendFile(new File(filePath));
  }

  async unlinkHandler(filePath) {
    await this.agent.sendUnlink(new File(filePath));
  }

  async addDirHandler(dirPath) {
    if (!(await this.checkIfExists(dirPath))) {
      return;
    }
    await this.agent.sendDir(new Directory(dirPath));
  }

  async unlinkDirHandler(dirPath) {
    await this.agent.sendUnlinkDir(new Directory(dirPath));
  }

  async errorHandler(e) {
    throw new Error(e);
  }

  async checkIfExists(path) {
    if (!path) return false;
    return new Promise(resolve => {
      access(path, err => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

export default Watcher;
