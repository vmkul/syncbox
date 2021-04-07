import { beforeEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import { EventEmitter } from 'events';
import Messenger from '../transport';

jest.mock('fs');

class Socket extends EventEmitter {
  constructor() {
    super();
    this.setTimeout = jest.fn();
    this.end = jest.fn();
    this.write = jest.fn().mockImplementation((data, cb) => cb());
    this.pipe = jest.fn();
    this.unpipe = jest.fn();
    this.resume = jest.fn();
  }
}

describe('Tests for transport', () => {
  let socket;
  let messenger;
  let lastEmitted;

  beforeEach(() => {
    socket = new Socket();
    messenger = new Messenger(socket);
    messenger.on('message', msg => {
      lastEmitted = msg;
    });
  });

  test('Socket data event', () => {
    socket.emit('data', 'message');
    expect(lastEmitted).toBe('message');

    messenger.isTransferringFile = true;
    socket.emit('data', 'another');
    expect(lastEmitted).toBe('message');
  });

  test('Socket error event', () => {
    socket.emit('error', 'Error message');
    expect(socket.end).toBeCalledTimes(1);
  });

  test('Socket timeout', () => {
    socket = new Socket();
    messenger = new Messenger(socket, 1000);
    socket.emit('timeout');
    expect(socket.setTimeout).toBeCalledTimes(1);
    expect(socket.end).toBeCalledTimes(1);
  });

  test('Socket close event', done => {
    messenger.on('close', done);
    socket.emit('close');
  });

  test('sendMessage method', async () => {
    await messenger.sendMessage('message');
    expect(socket.write).toBeCalledTimes(1);
    expect(socket.write.mock.calls[0][0]).toBe('message');
  });

  test('sendFile method', () => {
    const pipe = jest.fn();
    const file = {
      getReadStream() {
        return { pipe };
      },
    };
    messenger.sendFile(file);
    expect(pipe.mock.calls[0][0]).toBe(socket);
  });

  test('getFile method', async () => {
    const output = { close: jest.fn() };
    fs.createWriteStream = jest.fn().mockImplementation(() => output);
    setImmediate(() => {
      for (let i = 0; i < 10; i++) {
        socket.emit('data', { length: 10 });
      }
    });
    await messenger.getFile('file.txt', 100);

    expect(socket.pipe).toBeCalledWith(output);
    expect(socket.unpipe).toBeCalledTimes(1);
    expect(socket.resume).toBeCalledTimes(1);
    expect(output.close).toBeCalledTimes(1);
  });
});
