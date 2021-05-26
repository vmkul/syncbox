import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import ConnectionManager from '../connection_manager';
import Agent from '../../__mocks__/protocol';
import { AsyncQueue } from '../util';
import Diff from '../diff';

jest.mock('../diff');
jest.mock('../util');
AsyncQueue.mockImplementation(() => ({
  async addTask(task) {
    setImmediate(task);
  },
}));

describe('Tests for connection manager', () => {
  let conManager;

  beforeEach(() => {
    conManager = new ConnectionManager();
  });

  test('Add connection', async () => {
    const agent = new Agent();
    setImmediate(() => agent.emit('handshake'));
    await conManager.addConnection(agent);
    expect(conManager.connections.has(agent)).toBe(true);
  });

  test('Confirm transaction', async () => {
    const agent = new Agent();
    setImmediate(() => agent.emit('handshake'));
    await conManager.addConnection(agent);

    expect(agent.transactionChecker).toBeTruthy();
  });

  test('queueTransaction method', async () => {
    const agent = new Agent();

    setImmediate(() => agent.emit('transaction_end'));
    await conManager.queueTransaction(agent);

    expect(conManager.agentDiff.has(agent)).toBe(true);
  });

  test('Global sync', async () => {
    const numAgents = 10;
    const expectedMergesPerAgent = 9;
    const mergeWith = jest.fn();
    const patchAgent = jest.fn();

    Diff.mockImplementation(() => ({
      mergeWith,
      patchAgent,
      isEmpty() {
        return false;
      },
    }));

    for (let i = 0; i < numAgents; i++) {
      const agent = new Agent();
      conManager.connections.add(agent);
      conManager.agentDiff.set(agent, new Diff());
    }

    await conManager.syncWithConnected();

    expect(mergeWith).toBeCalledTimes(numAgents * expectedMergesPerAgent);
    expect(patchAgent).toBeCalledTimes(numAgents);
  });
});
