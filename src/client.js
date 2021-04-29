import net from 'net';
import Agent from './protocol.js';
import Messenger from './transport.js';
import Watcher from './watcher.js';
import { exitOnError } from './util.js';

const PORT = parseInt(process.env.CLIENT_PORT) || 3000;
const SYNC_DIR = process.env.CLIENT_SYNC_DIR || 'client';
const HOST = process.env.CLIENT_REMOTE_HOST || 'localhost';

const client = net.createConnection({ host: HOST, port: PORT }, async () => {
  const messenger = new Messenger(client);
  const agent = new Agent(messenger, SYNC_DIR);
  await agent.startNegotiation();
  new Watcher(SYNC_DIR, agent);
  agent.on('end', () => exitOnError('Connection closed'));
});
