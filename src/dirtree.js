import fs from 'fs';

class File {
  constructor(name, parentDir) {
    this.name = name;
    this.parentDir = parentDir;
  }

  getFullPath() {
    return this.parentDir.path + '/' + this.name;
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
  constructor(path, parentDir = null) {
    this.path = path;
    this.parentDir = parentDir;
    this.contents = this.scan();
  }

  scan() {
    const opened = this.open();
    const result = [];

    let dirent;

    while ((dirent = opened.readSync())) {
      if (dirent.isDirectory()) {
        const path = `${this.path}/${dirent.name}`;
        result.push(new Directory(path, this));
      } else {
        result.push(new File(dirent.name, this));
      }
    }

    this.close();

    return result;
  }

  open() {
    this.openedDir = fs.opendirSync(this.path);
    return this.openedDir;
  }

  close() {
    if (this.openedDir) {
      this.openedDir.closeSync();
      this.openedDir = null;
    }
  }
}

export { Directory };
