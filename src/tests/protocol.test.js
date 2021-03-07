import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import Agent from '../protocol';
import { EventEmitter } from 'events';

jest.mock('fs/promises');
import { mkdir } from 'fs/promises';

jest.mock('fs');
import fs from 'fs';
import {
  GetFileMessage,
  HandshakeMessage,
  MakeDirMessage,
  SuccessMessage,
} from '../message';

describe('Tests for protocol', () => {
  const messenger = new EventEmitter();
  const agent = new Agent(messenger, 'dir');

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
    const handshakeMessage = new HandshakeMessage();

    process.nextTick(() =>
      messenger.emit('message', JSON.stringify(handshakeMessage))
    );
    await agent.startNegotiation();

    expect(messenger.sendMessage).toBeCalledWith(
      JSON.stringify(handshakeMessage)
    );
    expect(agent.handShake).toBe(true);
  });

  test('FILE request', async () => {
    await agent.processMessage(new GetFileMessage('filename', 1000));

    expect(messenger.getFile).toHaveBeenCalledWith('dir/filename', 1000);
    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new SuccessMessage())
    );

    await agent.processMessage(new GetFileMessage('empty', 0));

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

    process.nextTick(() => {
      messenger.emit('message', JSON.stringify(new SuccessMessage()));
      setTimeout(() => {
        messenger.emit('message', JSON.stringify(new SuccessMessage()));
      }, 0);
    });
    await agent.sendFile(file);

    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new GetFileMessage('test.txt', 1000))
    );
    expect(messenger.sendFile).toHaveBeenCalledWith(file);
  });

  test('sendDir method', async () => {
    process.nextTick(() =>
      messenger.emit('message', JSON.stringify(new SuccessMessage()))
    );
    await agent.sendDir({ path: 'test' });

    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new MakeDirMessage('test'))
    );
  });

  test('createDir method', async () => {
    await agent.processMessage(new MakeDirMessage('test'));

    expect(mkdir).toHaveBeenCalledWith('dir/test', { recursive: true });
    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new SuccessMessage())
    );
  });

  test('Unknown request', done => {
    messenger.emit('message', JSON.stringify({ type: 'unknown' }));

    process.nextTick(() => {
      expect(messenger.closeConnection).toHaveBeenCalled();
      done();
    });
  });
});
