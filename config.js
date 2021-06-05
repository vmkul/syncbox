import path from 'path';

const server = {
  start: true,
  port: 3000,
  syncDir: path.join(path.resolve(), 'server'),
};

const client = {
  start: true,
  remoteHost: 'localhost',
  port: 3000,
  syncDir: path.join(path.resolve(), 'client'),
};

export { server, client };
