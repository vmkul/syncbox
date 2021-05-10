import fs from 'fs';
import { sep, normalize, relative, isAbsolute } from 'path';

const syncDir = process.env.SERVER_SYNC_DIR
  ? process.env.SERVER_SYNC_DIR
  : process.env.CLIENT_SYNC_DIR;

const sliceOutermostDir = path => path.split(sep).slice(1).join(sep);

class Directory {
  constructor(path) {
    this.path = normalize(path);
  }

  getFullPath() {
    return this.path;
  }

  getRelativePath() {
    if (isAbsolute(this.getFullPath())) {
      return relative(syncDir, this.getFullPath());
    } else {
      return sliceOutermostDir(this.getFullPath());
    }
  }
}

class File extends Directory {
  constructor(path) {
    super(path);
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

export { Directory, File };
