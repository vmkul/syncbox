import { EventEmitter } from 'events';
import { mkdir, unlink, rmdir } from 'fs/promises';
import fs from 'fs';
import { sep } from 'path';
import { HANDSHAKE_MESSAGE, messageType } from './constants.js';
import {
  GetFileMessage,
  SuccessMessage,
  MakeDirMessage,
  HandshakeMessage,
  FailMessage,
  TransactionMessage,
  UnlinkMessage,
  UnlinkDirMessage,
} from './message.js';

class Agent extends EventEmitter {
  constructor(messenger, rootDirPath) {
    super();
    this.messenger = messenger;
    this.rootDirPath = rootDirPath;
    this.handShake = false;
    this.starter = false;
    this.activeTransaction = false;
    this.messageHandlers = new Map();

    this.messageHandlers.set(messageType.GET_FILE, this.getFile.bind(this));
    this.messageHandlers.set(messageType.MKDIR, this.createDir.bind(this));
    this.messageHandlers.set(messageType.UNLINK, this.unlinkFile.bind(this));
    this.messageHandlers.set(messageType.UNLINK_DIR, this.unlinkDir.bind(this));
    this.messageHandlers.set(
      messageType.TRANSACTION,
      this.toggleTransaction.bind(this)
    );
    this.messageHandlers.set(messageType.SUCCESS, () =>
      this.emit('operation_success')
    );
    this.messageHandlers.set(messageType.FAIL, () =>
      this.messenger.closeConnection()
    );

    messenger.on('message', async msg => {
      try {
        console.log(this.rootDirPath + ': ' + msg);
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
    } else {
      const handler = this.messageHandlers.get(message.type);

      if (handler) {
        await handler(message);
      } else {
        throw new Error('Unknown request: ' + message);
      }
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
        await this.waitFor('operation_success');
      } else {
        await this.sendMessage(new SuccessMessage());
      }
      this.emit('handshake');
      console.log('Handshake success!');
    }
  }

  async startTransaction() {
    await this.checkTransaction();
    await this.sendMessage(new TransactionMessage());
    await this.waitFor('operation_success');
    console.log('TRANSACTION STARTED');
  }

  async endTransaction() {
    await this.sendMessage(new TransactionMessage());
  }

  async toggleTransaction() {
    this.activeTransaction = !this.activeTransaction;
    if (!this.activeTransaction) {
      this.emit('transaction_end');
      console.log('TRANSACTION END');
    } else {
      await this.sendMessage(new SuccessMessage());
    }
  }

  async checkTransaction() {
    if (this.activeTransaction) {
      console.log('WAITING TRANSACTION');
      await this.waitFor('transaction_end');
      console.log('TRANSACTION END');
    }
  }

  isInTransaction() {
    return this.activeTransaction;
  }

  async getFile(file) {
    const { path, size } = file;

    if (size === 0) {
      fs.closeSync(fs.openSync(this.rootDirPath + sep + path, 'w'));
    } else {
      await this.sendMessage(new SuccessMessage());
      await this.messenger.getFile(this.rootDirPath + sep + path, size);
    }

    await this.sendMessage(new SuccessMessage());
  }

  async sendDir(dir) {
    await this.checkTransaction();
    console.log('Sending create DIR ' + dir.path);
    await this.sendMessage(new MakeDirMessage(dir.getRelativePath()));
    await this.waitFor('operation_success');
    console.log('Successfully created DIR ' + dir.path);
  }

  async createDir(dir) {
    const path = this.rootDirPath + sep + dir.path;
    console.log('Creating dir ' + path);
    await mkdir(path, { recursive: true });
    await this.sendMessage(new SuccessMessage());
  }

  async startNegotiation() {
    this.starter = true;
    await this.sayHi();
    await this.waitFor('handshake');
  }

  async sayHi() {
    await this.sendMessage(new HandshakeMessage());
  }

  async sendFile(file) {
    await this.checkTransaction();
    const size = await file.getSize();
    await this.sendMessage(new GetFileMessage(file.getRelativePath(), size));
    if (size !== 0) {
      await this.waitFor('operation_success');
      this.messenger.sendFile(file);
    }
    await this.waitFor('operation_success');
    console.log('Sending successfully completed!');
  }

  async sendUnlink(file) {
    await this.checkTransaction();
    await this.sendMessage(new UnlinkMessage(file.getRelativePath()));
    await this.waitFor('operation_success');
    console.log(`Unlink for ${file.getRelativePath()} completed!`);
  }

  async unlinkFile(file) {
    const { path } = file;
    const localPath = this.rootDirPath + sep + path;
    try {
      await unlink(localPath);
    } catch (e) {
      console.log(`File ${localPath} does not exist!`);
    }
    await this.sendMessage(new SuccessMessage());
  }

  async sendUnlinkDir(dir) {
    await this.checkTransaction();
    await this.sendMessage(new UnlinkDirMessage(dir.getRelativePath()));
    await this.waitFor('operation_success');
    console.log(`Unlink for ${dir.path} completed!`);
  }

  async unlinkDir(dir) {
    const localPath = this.rootDirPath + sep + dir.path;
    await rmdir(localPath, { recursive: true });
    await this.sendMessage(new SuccessMessage());
  }

  waitFor(event) {
    return new Promise(resolve => {
      this.once(event, resolve);
    });
  }
}

export default Agent;
