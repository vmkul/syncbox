import { EventEmitter } from 'events';
import { mkdir } from 'fs/promises';
import fs from 'fs';
import { HANDSHAKE_MESSAGE, messageType } from './constants.js';
import {
  GetFileMessage,
  SuccessMessage,
  MakeDirMessage,
  HandshakeMessage,
  FailMessage,
} from './message.js';

class Agent extends EventEmitter {
  constructor(messenger, rootDirPath) {
    super();
    this.messenger = messenger;
    this.rootDirPath = rootDirPath;
    this.handShake = false;
    this.starter = false;
    messenger.on('message', async msg => {
      try {
        msg = JSON.parse(msg);
        await this.processMessage(msg);
      } catch (e) {
        console.error('Error while processing!');
        console.error(e);
        await this.sendMessage(new FailMessage(e.message));
        await this.messenger.closeConnection();
        this.emit('end');
      }
    });

    messenger.on('close', () => this.emit('end'));
  }

  async processMessage(message) {
    if (!this.handShake) {
      await this.shakeHands(message);
    } else if (message.type === messageType.GET_FILE) {
      await this.getFile(message);
    } else if (message.type === messageType.MKDIR) {
      await this.createDir(message);
    } else if (message.type === messageType.SUCCESS) {
      this.emit('operation_success');
    } else if (message.type === messageType.FAIL) {
      await this.messenger.closeConnection();
    } else {
      throw new Error('Unknown request: ' + message);
    }
  }

  async sendMessage(msg) {
    await this.messenger.sendMessage(JSON.stringify(msg));
  }

  async shakeHands(message) {
    if (message.text !== HANDSHAKE_MESSAGE) {
      throw new Error(`Bad handshake! Expected: ${HANDSHAKE_MESSAGE}`);
    } else {
      this.handShake = true;
      if (!this.starter) {
        await this.sayHi();
        await this.ensureOperationSuccess();
      } else {
        await this.sendMessage(new SuccessMessage());
      }
      this.emit('handshake');
      console.log('Handshake success!');
    }
  }

  async getFile(file) {
    const { path, size } = file;

    if (size === 0) {
      fs.closeSync(fs.openSync(`${this.rootDirPath}/${path}`, 'w'));
    } else {
      await this.messenger.getFile(`${this.rootDirPath}/${path}`, size);
    }

    await this.sendMessage(new SuccessMessage());
  }

  async sendDir(dir) {
    console.log('Sending create DIR ' + dir.path);
    await this.sendMessage(new MakeDirMessage(dir.path));
    await this.ensureOperationSuccess();
    console.log('Successfully created DIR ' + dir.path);
  }

  async createDir(dir) {
    const path = `${this.rootDirPath}/${dir.path}`;
    await mkdir(path, { recursive: true });
    await this.sendMessage(new SuccessMessage());
  }

  async startNegotiation() {
    this.starter = true;
    await this.sayHi();
    await this.ensureHandShake();
  }

  ensureHandShake() {
    return new Promise(resolve => {
      this.once('handshake', resolve);
    });
  }

  async sayHi() {
    await this.sendMessage(new HandshakeMessage());
  }

  async sendFile(file) {
    console.log('Sending file ' + file.getFullPath());
    const size = await file.getSize();
    await this.sendMessage(new GetFileMessage(file.getFullPath(), size));
    this.messenger.sendFile(file);
    await this.ensureOperationSuccess();
    console.log('Sending successfully completed!');
  }

  ensureOperationSuccess() {
    return new Promise(resolve => {
      this.once('operation_success', resolve);
    });
  }
}

export default Agent;
