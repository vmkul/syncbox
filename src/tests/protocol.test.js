import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import Agent from '../protocol';
import { EventEmitter } from 'events';
import { HANDSHAKE_MESSAGE, SUCCESS_MESSAGE } from '../constants';

jest.mock('fs/promises');
import { mkdir } from 'fs/promises';

jest.mock('fs');
import fs from 'fs';

describe('Tests for protocol', () => {
  const messenger = new EventEmitter();
  const agent = new Agent(messenger);

  beforeEach(() => {
    messenger.sendMessage = jest.fn();
    messenger.getFile = jest.fn();
    messenger.sendFile = jest.fn();
    messenger.closeConnection = jest.fn();
  });

  test('Handshake fail', async () => {
    try {
      await agent.processMessage('Hello');
    } catch (e) {
      expect(agent.handShake).toBe(false);
    }
  });

  test('Handshake', async () => {
    process.nextTick(() => messenger.emit('message', HANDSHAKE_MESSAGE));
    await agent.startNegotiation();

    expect(messenger.sendMessage).toBeCalledWith(HANDSHAKE_MESSAGE);
    expect(agent.handShake).toBe(true);
  });

  test('FILE request', async () => {
    await agent.processMessage('FILE filename 1000');

    expect(messenger.getFile).toHaveBeenCalledWith('filename', 1000);
    expect(messenger.sendMessage).toHaveBeenCalledWith(SUCCESS_MESSAGE);

    await agent.processMessage('FILE empty 0');

    expect(fs.closeSync).toHaveBeenCalled();
    expect(fs.openSync).toHaveBeenCalled();
  });

  test('sendFile method', async () => {
    const file = {
      getFullPath() {
        return 'test.txt';
      },
      getSize() {
        return 1000;
      },
    };

    process.nextTick(() => messenger.emit('message', SUCCESS_MESSAGE));
    await agent.sendFile(file);

    expect(messenger.sendMessage).toHaveBeenCalledWith('FILE test.txt 1000');
    expect(messenger.sendFile).toHaveBeenCalledWith(file);
  });

  test('sendDir method', async () => {
    process.nextTick(() => messenger.emit('message', SUCCESS_MESSAGE));
    await agent.sendDir({ path: 'test' });

    expect(messenger.sendMessage).toHaveBeenCalledWith('DIR test');
  });

  test('createDir method', async () => {
    await agent.processMessage('DIR test');

    expect(mkdir).toHaveBeenCalledWith('./dest/test', { recursive: true });
    expect(messenger.sendMessage).toHaveBeenCalledWith(SUCCESS_MESSAGE);
  });

  test('Unknown request', done => {
    messenger.emit('message', 'Bad');

    process.nextTick(() => {
      expect(messenger.closeConnection).toHaveBeenCalled();
      done();
    });
  });
});
