import { EventEmitter } from 'events';
import { HANDSHAKE_MESSAGE, SUCCESS_MESSAGE } from './constants.js';

class Agent extends EventEmitter {
  constructor(messenger) {
    super();
    this.messenger = messenger;
    this.handShake = false;
    this.starter = false;
    messenger.on('message', async msg => {
      try {
        await this.processMessage(msg.toString('utf-8'));
      } catch (e) {
        console.error('Error while processing!');
        console.error(e);
        await this.messenger.closeConnection();
      }
    });
  }

  async processMessage(message) {
    if (!this.handShake) {
      await this.shakeHands(message);
    } else if (message.startsWith('FILE')) {
      await this.getFile(message);
    } else if (message === SUCCESS_MESSAGE) {
      this.emit('operation_success');
    } else {
      throw new Error('Unknown request: ' + message);
    }
  }

  async shakeHands(message) {
    if (message !== HANDSHAKE_MESSAGE) {
      throw new Error(`Bad handshake! Expected: ${HANDSHAKE_MESSAGE}`);
    } else {
      this.handShake = true;
      this.emit('handshake');
      if (!this.starter) await this.sayHi();
      console.log('Handshake success!');
    }
  }

  async getFile(message) {
    const filePath = message.split(' ')[1];
    const fileSize = parseInt(message.split(' ')[2]);
    await this.messenger.getFile(filePath, fileSize);
    await this.messenger.sendMessage(SUCCESS_MESSAGE);
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
    await this.messenger.sendMessage(HANDSHAKE_MESSAGE);
  }

  async sendFile(file) {
    console.log('Sending file ' + file.name);
    const size = await file.getSize();
    await this.messenger.sendMessage(`FILE ${file.name} ${size}`);
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