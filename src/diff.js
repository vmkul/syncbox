import { dirname } from 'path';
import { File, Directory } from './dirtree.js';

class Diff {
  constructor(parentDirPath = '.') {
    this.parentDirPath = parentDirPath;
    this.filesToAdd = new Set();
    this.dirsToAdd = new Set();
    this.filesToUnlink = new Set();
    this.dirsToUnlink = new Set();
  }

  addFile(path) {
    this.ensureDirNotDeleted(dirname(path));
    this.filesToUnlink.delete(path);
    this.filesToAdd.add(path);
  }

  addDir(path) {
    this.ensureDirNotDeleted(path);
    this.dirsToAdd.add(path);
  }

  addUnlink(path) {
    if (this.checkDirIsRemoved(dirname(path))) {
      return;
    }
    this.filesToAdd.delete(path);
    this.filesToUnlink.add(path);
  }

  addUnlinkDir(path) {
    if (this.checkDirIsRemoved(dirname(path))) {
      return;
    }
    this.ensureChildNodeNotAdded(path);
    this.dirsToAdd.delete(path);
    this.dirsToUnlink.add(path);
  }

  ensureDirNotDeleted(path) {
    while (path !== this.parentDirPath) {
      this.dirsToUnlink.delete(path);
      path = dirname(path);
    }
  }

  ensureChildNodeNotAdded(path) {
    for (const filePath of this.filesToAdd) {
      if (filePath.startsWith(path)) {
        this.filesToAdd.delete(filePath);
      }
    }
    for (const dirPath of this.dirsToAdd) {
      if (dirPath.startsWith(path)) {
        this.dirsToAdd.delete(dirPath);
      }
    }
  }

  checkDirIsRemoved(path) {
    while (path !== this.parentDirPath) {
      if (this.dirsToUnlink.has(path)) {
        return true;
      }
      path = dirname(path);
    }

    return false;
  }

  mergeWith(diff) {
    diff.filesToAdd.forEach(file => this.addFile(file));
    diff.filesToUnlink.forEach(file => this.addUnlink(file));
    diff.dirsToAdd.forEach(dir => this.addDir(dir));
    diff.dirsToUnlink.forEach(dir => this.addUnlinkDir(dir));
  }

  async patchAgent(agent) {
    return new Promise((resolve, reject) => {
      agent.on('end', reject);
      this.applyChanges(agent).then(resolve).catch(reject);
    });
  }

  async applyChanges(agent) {
    await agent.startTransaction();

    for (const dir of this.dirsToAdd) {
      await agent.sendDir(new Directory(dir));
    }

    for (const file of this.filesToAdd) {
      await agent.sendFile(new File(file));
    }

    for (const file of this.filesToUnlink) {
      await agent.sendUnlink(new File(file));
    }

    for (const dir of this.dirsToUnlink) {
      await agent.sendUnlinkDir(new Directory(dir));
    }

    await agent.endTransaction();
  }

  isEmpty() {
    return (
      this.filesToAdd.size === 0 &&
      this.dirsToAdd.size === 0 &&
      this.filesToUnlink.size === 0 &&
      this.dirsToUnlink.size === 0
    );
  }
}

export default Diff;
