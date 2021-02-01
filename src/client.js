import net from 'net';

import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';
import { Directory, File } from './dirtree.js';

const dir = new Directory('source');

const sendAllFilesInDir = async (dir, agent) => {
  for (const entry of dir.contents) {
    if (entry instanceof File) {
      await agent.sendFile(entry);
    }
  }
};

const syncDir = async (root, agent) => {
  await agent.sendDir(root);
  await sendAllFilesInDir(root, agent);
  for (const entry of root.contents) {
    if (entry instanceof Directory) {
      await syncDir(entry, agent);
    }
  }
};

const client = net.createConnection({ port: PORT }, async () => {
  const messenger = new Messenger(client);
  const agent = new Agent(messenger);
  await agent.startNegotiation();
  await syncDir(dir, agent);
});
