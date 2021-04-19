import { beforeEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import { EventEmitter } from 'events';
import Messenger from '../transport';
import Socket from '../../__mocks__/socket';

jest.mock('fs');

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

  test('Socket error event', done => {
    messenger.on('close', done);
    socket.emit('error', 'Error message');
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

  test('sendFile method', async () => {
    const pipe = jest.fn();
    const stream = new EventEmitter();
    stream.pipe = pipe;

    const file = {
      getReadStream() {
        return stream;
      },
    };

    setImmediate(() => stream.emit('end'));
    await messenger.sendFile(file);
    expect(pipe.mock.calls[0][0]).toBe(socket);
  });

  test('getFile method', async () => {
    const output = { close: jest.fn(), on: jest.fn() };
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

  test('getFile output stream emits error', async () => {
    const output = new EventEmitter();
    fs.createWriteStream = jest.fn().mockImplementation(() => output);
    setImmediate(() => output.emit('error', new Error()));

    try {
      await messenger.getFile('file.txt', 100);
    } catch (e) {
      console.error(e);
    }

    expect(socket.unpipe).toBeCalledTimes(1);
    expect(socket.resume).toBeCalledTimes(1);
  });

  test('Timeout methods', () => {
    messenger.setTimeout(500);
    messenger.clearTimeout();

    expect(socket.setTimeout).toBeCalledTimes(2);
    expect(socket.setTimeout).toHaveBeenNthCalledWith(1, 500);
    expect(socket.setTimeout).toHaveBeenNthCalledWith(2, 0);
  });
});
