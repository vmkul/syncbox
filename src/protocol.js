import { EventEmitter } from 'events';
import { mkdir, unlink, rmdir } from 'fs/promises';
import fs from 'fs';
import { sep, normalize } from 'path';
import {
  HANDSHAKE_MESSAGE,
  messageType,
  RESPONSE_TIMEOUT,
} from './constants.js';
import Diff from './diff.js';
import EventDispatcher from './event_dispatcher.js';
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

const ERR_MSG_TRANSACTION_NOT_STARTED =
  'Operation refused. Transaction not started';

class Agent extends EventEmitter {
  constructor(messenger, rootDirPath) {
    super();
    this.messenger = messenger;
    this.rootDirPath = rootDirPath;
    this.handShake = false;
    this.starter = false;
    this.activeTransaction = false;
    this.transactionDiff = new Diff();
    this.eventDispatcher = new EventDispatcher();
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
      this.eventDispatcher.registerEvent('operation_success')
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
        await this.messenger.closeConnection(
          JSON.stringify(new FailMessage(e.message))
        );
      }
    });

    messenger.on('close', () => {
      if (this.isInTransaction()) {
        this.emit('transaction_end', new Diff());
      }
      this.emit('end');
    });
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
      this.eventDispatcher.registerEvent('handshake');
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
    if (this.transactionChecker && !this.activeTransaction) {
      try {
        await this.transactionChecker(this);
      } catch (e) {
        throw new Error('Could not check transaction!');
      }
    }
    this.activeTransaction = !this.activeTransaction;
    if (!this.activeTransaction) {
      this.emit('transaction_end', this.transactionDiff);
      this.eventDispatcher.registerEvent('transaction_end');
      this.messenger.clearTimeout();
      console.log('TRANSACTION END');
    } else {
      this.transactionDiff = new Diff();
      await this.sendMessage(new SuccessMessage());
      this.messenger.setTimeout(RESPONSE_TIMEOUT);
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

  runBeforeTransaction(transactionChecker) {
    this.transactionChecker = transactionChecker;
  }

  async getFile(file) {
    if (!this.isInTransaction()) {
      throw new Error(ERR_MSG_TRANSACTION_NOT_STARTED);
    }

    const { path, size } = file;
    const localPath = this.transformPath(path);
    this.transactionDiff.addFile(localPath);

    if (size === 0) {
      fs.closeSync(fs.openSync(localPath, 'w'));
    } else {
      await this.sendMessage(new SuccessMessage());
      await this.messenger.getFile(localPath, size);
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
    if (!this.isInTransaction()) {
      throw new Error(ERR_MSG_TRANSACTION_NOT_STARTED);
    }

    const path = this.transformPath(dir.path);
    this.transactionDiff.addDir(path);
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
      await this.messenger.sendFile(file);
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
    if (!this.isInTransaction()) {
      throw new Error(ERR_MSG_TRANSACTION_NOT_STARTED);
    }

    const { path } = file;
    const localPath = this.transformPath(path);
    this.transactionDiff.addUnlink(localPath);
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
    if (!this.isInTransaction()) {
      throw new Error(ERR_MSG_TRANSACTION_NOT_STARTED);
    }

    const localPath = this.transformPath(dir.path);
    this.transactionDiff.addUnlinkDir(localPath);
    await rmdir(localPath, { recursive: true });
    await this.sendMessage(new SuccessMessage());
  }

  transformPath(path) {
    if (sep === '/') {
      if (path.includes('\\')) {
        path = path.split('\\').join('/');
      }
    } else if (path.includes('/')) {
      path = path.split('/').join('\\');
    }
    path = normalize(path);
    return this.rootDirPath + sep + path;
  }

  async waitFor(event, setResponseTimeout = true) {
    if (setResponseTimeout) this.messenger.setTimeout(RESPONSE_TIMEOUT);
    return new Promise((resolve, reject) => {
      this.once('end', reject);
      this.eventDispatcher.waitEvent(event).then(() => {
        this.messenger.clearTimeout();
        resolve();
      });
    });
  }
}

export default Agent;
