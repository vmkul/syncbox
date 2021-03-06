import net from 'net';
import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';

const client = net.createConnection({ port: PORT }, async () => {
  const messenger = new Messenger(client);
  const agent = new Agent(messenger, 'client');
  await agent.startNegotiation();
});
