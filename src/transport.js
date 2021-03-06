import { EventEmitter } from 'events';
import { createWriteStream } from 'fs';

class Messenger extends EventEmitter {
  constructor(socket, socketTimeout) {
    super();
    this.socket = socket;
    this.isTransferringFile = false;

    socket.on('data', data => {
      if (!this.isTransferringFile) {
        this.emit('message', data.toString('utf-8'));
      }
    });

    socket.on('error', e => {
      console.error('Connection closed on error!');
      console.error(e);
    });

    if (socketTimeout) {
      socket.setTimeout(socketTimeout);
    }

    socket.on('timeout', async () => {
      console.log('socket timeout');
      await this.closeConnection();
    });

    socket.on('close', () => this.emit('close'));
  }

  async sendMessage(msg) {
    await this.writeSocket(msg);
  }

  writeSocket(data) {
    return new Promise(resolve => {
      this.socket.write(data, resolve);
    });
  }

  sendFile(file) {
    return new Promise((resolve, reject) => {
      const stream = file.getReadStream();
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.pipe(this.socket, { end: false });
    });
  }

  getFile(filePath, size) {
    return new Promise((resolve, reject) => {
      this.isTransferringFile = true;
      let bytesWritten = 0;

      const output = createWriteStream(filePath);

      output.on('error', e => {
        this.socket.unpipe();
        this.socket.resume();
        reject(e);
      });

      this.socket.pipe(output);

      const listener = async chunk => {
        bytesWritten += chunk.length;
        if (bytesWritten === size) {
          this.isTransferringFile = false;
          this.socket.unpipe();
          output.close();
          this.socket.off('data', listener);
          this.socket.resume(); // Switch stream back to flowing mode after unpipe
          resolve();
        }
      };

      this.socket.on('data', listener);
    });
  }

  setTimeout(timeout) {
    this.socket.setTimeout(timeout);
  }

  clearTimeout() {
    this.socket.setTimeout(0);
  }

  closeConnection(msg) {
    return new Promise(resolve => {
      this.socket.end(msg, 'utf8', resolve);
    });
  }
}

export default Messenger;
