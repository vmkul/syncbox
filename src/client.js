import net from 'net';

import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';
import { Directory } from './dirtree.js';

const dir = new Directory('./src');

const sendAllFilesInDir = async (dir, agent) => {
  for (const file of dir.contents) {
    await agent.sendFile(file);
  }
};

const client = net.createConnection({ port: PORT }, async () => {
  const messenger = new Messenger(client);
  const agent = new Agent(messenger);
  await agent.startNegotiation();
  await sendAllFilesInDir(dir, agent);
});
