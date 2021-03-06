import { EventEmitter } from 'events';
import { createWriteStream } from 'fs';

class Messenger extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.isTransferringFile = false;

    socket.on('data', data => {
      if (!this.isTransferringFile) {
        this.emit('message', data.toString('utf-8'));
      }
    });

    socket.on('error', async e => {
      console.error('Connection closed on error!');
      console.error(e);
      await this.closeConnection();
    });

    socket.setTimeout(3000);
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
    const stream = file.getReadStream();
    stream.pipe(this.socket, { end: false });
  }

  getFile(filePath, size) {
    return new Promise(resolve => {
      this.isTransferringFile = true;
      let bytesWritten = 0;

      const output = createWriteStream(filePath);

      console.log('Getting file ' + filePath);

      const promisedWrite = chunk =>
        new Promise(resolve => {
          output.write(chunk, resolve);
        });

      const listener = async chunk => {
        await promisedWrite(chunk);
        bytesWritten += chunk.length;
        if (bytesWritten === size) {
          output.close();
          this.isTransferringFile = false;
          console.log('Getting file completed successfully!');
          this.socket.off('data', listener);
          resolve();
        }
      };

      this.socket.on('data', listener);
    });
  }

  closeConnection() {
    return new Promise(resolve => {
      this.socket.end(resolve);
    });
  }
}

export default Messenger;
