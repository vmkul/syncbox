import net from 'net';

import { PORT } from './constants.js';
import Agent from './protocol.js';
import Messenger from './transport.js';

net
  .createServer(socket => {
    const messenger = new Messenger(socket);
    new Agent(messenger);
  })
  .listen(PORT);
