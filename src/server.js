import net from 'net';
import Agent from './protocol.js';
import Messenger from './transport.js';
import ConnectionManager from './connection_manager.js';
import { Directory } from './dirtree.js';

const PORT = parseInt(process.env.SERVER_PORT);
const SYNC_DIR = process.env.SERVER_SYNC_DIR;
const conManager = new ConnectionManager(new Directory(SYNC_DIR));

net
  .createServer(async socket => {
    const messenger = new Messenger(socket);
    const agent = new Agent(messenger, SYNC_DIR);
    await conManager.addConnection(agent);
  })
  .listen(PORT);
