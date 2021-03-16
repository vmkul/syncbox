import net from 'net';
import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';
import Watcher from './watcher.js';

const client = net.createConnection({ port: PORT }, async () => {
  const messenger = new Messenger(client);
  const agent = new Agent(messenger, 'client');
  await agent.startNegotiation();
  agent.once('transaction_end', () => {
    new Watcher('client', agent);
  });
});
