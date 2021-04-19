import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import Watcher from '../watcher';
import Agent from '../../__mocks__/protocol';
import chokidar from '../../__mocks__/chokidar';
import { Directory, File } from '../dirtree';
import fsPromises from 'fs/promises';

fsPromises.open.mockImplementation(() => ({
  close() {},
}));

jest.mock('../util');
jest.mock('fs/promises');

describe('Tests for watcher', () => {
  let agent;
  let watcher;
  const TEST_PATH = 'test';

  beforeEach(() => {
    agent = new Agent();
    watcher = new Watcher(TEST_PATH, agent);
  });

  test('All fs events', async () => {
    chokidar.ee.emit('ready');

    chokidar.ee.emit('add');
    chokidar.ee.emit('change');
    chokidar.ee.emit('unlink');
    chokidar.ee.emit('addDir');
    chokidar.ee.emit('unlinkDir');

    expect(watcher.taskQueue.addTask).toBeCalledTimes(5);
  });

  test('Ignore events if agent is in transaction', async () => {
    agent.activeTransaction = true;

    chokidar.ee.emit('ready');

    chokidar.ee.emit('add');
    chokidar.ee.emit('change');
    chokidar.ee.emit('unlink');
    chokidar.ee.emit('addDir');
    chokidar.ee.emit('unlinkDir');

    expect(watcher.taskQueue.addTask).toBeCalledTimes(0);
  });

  test('Event handling methods', async () => {
    try {
      await watcher.changeHandler(TEST_PATH);
      await watcher.unlinkHandler(TEST_PATH);
      await watcher.addDirHandler(TEST_PATH);
      await watcher.unlinkDirHandler(TEST_PATH);
    } catch (e) {
      console.error(e);
    }

    expect(agent.sendFile).toBeCalledWith(new File(TEST_PATH));
    expect(agent.sendUnlink).toBeCalledWith(new File(TEST_PATH));
    expect(agent.sendDir).toBeCalledWith(new Directory(TEST_PATH));
    expect(agent.sendUnlinkDir).toBeCalledWith(new Directory(TEST_PATH));
  });

  test('checkIfAccessible returns false', async () => {
    fsPromises.open.mockImplementation(() => {
      throw new Error('Could not open file!');
    });

    await watcher.changeHandler(TEST_PATH);
    await watcher.changeHandler();

    expect(agent.sendFile).toBeCalledTimes(0);
  });

  test('Ignore all watcher errors', () => {
    chokidar.ee.emit('error', new Error('error'));
  });
});
