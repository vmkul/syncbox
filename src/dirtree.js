import fs from 'fs';
import { sep, normalize } from 'path';

class File {
  constructor(path) {
    this.path = normalize(path);
  }

  getFullPath() {
    return this.path;
  }

  getRelativePath() {
    return this.getFullPath().split(sep).slice(1).join(sep);
  }

  async getSize() {
    const stats = await fs.promises.stat(this.getFullPath());
    return stats.size;
  }

  getReadStream() {
    return fs.createReadStream(this.getFullPath());
  }

  getWriteStream() {
    return fs.createWriteStream(this.getFullPath());
  }
}

class Directory {
  constructor(path) {
    this.path = normalize(path);
  }

  getFullPath() {
    return this.path;
  }

  getRelativePath() {
    return this.path.split(sep).slice(1).join(sep);
  }
}

export { Directory, File };
