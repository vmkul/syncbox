import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import ConnectionManager from '../connection_manager';
import Agent from '../../__mocks__/protocol';

jest.mock('../util');

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
});
