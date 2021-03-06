import net from 'net';
import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';
import ConnectionManager from './connection_manager.js';
import { Directory } from './dirtree.js';

const conManager = new ConnectionManager(new Directory('server'));

net
  .createServer(async socket => {
    const messenger = new Messenger(socket);
    const agent = new Agent(messenger, 'server');
    await conManager.addConnection(agent);
  })
  .listen(PORT);
