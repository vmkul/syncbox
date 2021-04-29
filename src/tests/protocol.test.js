import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import Agent from '../protocol';
import { sep } from 'path';
import Messenger from '../../__mocks__/transport';

jest.mock('fs/promises');
import { mkdir } from 'fs/promises';

jest.mock('fs');
import fs from 'fs';
import {
  FailMessage,
  GetFileMessage,
  HandshakeMessage,
  MakeDirMessage,
  SuccessMessage,
  TransactionMessage,
} from '../message';

describe('Tests for protocol', () => {
  let messenger;
  let agent;
  const testFile = {
    getFullPath() {
      return 'dir/test.txt';
    },
    getRelativePath() {
      return 'test.txt';
    },
    getSize() {
      return 1000;
    },
  };

  const receiveMessage = msg => messenger.emit('message', JSON.stringify(msg));

  beforeEach(() => {
    messenger = new Messenger();
    agent = new Agent(messenger, 'dir');
    agent.handShake = true;
  });

  test('Handshake fail', done => {
    agent.handShake = false;
    const msg = new HandshakeMessage();
    msg.text = 'Bad message';

    receiveMessage(msg);

    agent.on('end', () => {
      expect(agent.handShake).toBe(false);
      done();
    });
  });

  test('Handshake', async () => {
    agent.handShake = false;
    const handshakeMessage = new HandshakeMessage();

    process.nextTick(() => receiveMessage(handshakeMessage));
    await agent.startNegotiation();

    expect(messenger.sendMessage).toBeCalledWith(
      JSON.stringify(handshakeMessage)
    );
    expect(agent.handShake).toBe(true);
  });

  test('FILE request', async () => {
    await agent.processMessage(new TransactionMessage());
    await agent.processMessage(new GetFileMessage('filename', 1000));

    expect(messenger.getFile).toHaveBeenCalledWith(`dir${sep}filename`, 1000);
    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new SuccessMessage())
    );

    await agent.processMessage(new GetFileMessage('empty', 0));

    expect(fs.closeSync).toHaveBeenCalled();
    expect(fs.openSync).toHaveBeenCalled();
  });

  test('sendFile method', async () => {
    process.nextTick(() => {
      receiveMessage(new SuccessMessage());
      setTimeout(() => {
        receiveMessage(new SuccessMessage());
      }, 0);
    });
    await agent.sendFile(testFile);

    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new GetFileMessage('test.txt', 1000))
    );
    expect(messenger.sendFile).toHaveBeenCalledWith(testFile);
  });

  test('sendDir method', async () => {
    process.nextTick(() => receiveMessage(new SuccessMessage()));
    await agent.sendDir({
      getRelativePath() {
        return 'test';
      },
    });

    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new MakeDirMessage('test'))
    );
  });

  test('createDir method', async () => {
    await agent.processMessage(new TransactionMessage());
    await agent.processMessage(new MakeDirMessage('test'));

    expect(mkdir).toHaveBeenCalledWith(`dir${sep}test`, { recursive: true });
    expect(messenger.sendMessage).toHaveBeenCalledWith(
      JSON.stringify(new SuccessMessage())
    );
  });

  test('Unknown request', done => {
    receiveMessage({ type: 'unknown' });

    process.nextTick(() => {
      expect(messenger.closeConnection).toHaveBeenCalled();
      done();
    });
  });

  test('Timeout during transaction', done => {
    receiveMessage(new TransactionMessage());
    receiveMessage(new GetFileMessage('test', 1000));
    agent.on('end', done);
  });

  test('Send method exceptions', done => {
    agent.sendFile(testFile).catch(done);
  });

  test('createDir throws when transaction not started', done => {
    receiveMessage(new MakeDirMessage('test'));

    agent.on('end', () => {
      expect(messenger.closeConnection).toBeCalledWith(
        JSON.stringify(
          new FailMessage('Operation refused. Transaction not started')
        )
      );
      done();
    });
  });
});
