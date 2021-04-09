import { mkdir, opendir } from 'fs/promises';
import { fork } from 'child_process';
import { server, client } from './config.js';
import { exitOnError } from './src/util.js';

const checkOrCreateDir = async path => {
  try {
    await (await opendir(path)).close();
  } catch (e) {
    await mkdir(path);
  }
};

const ac = new AbortController();

(async () => {
  if (server.start) {
    try {
      await checkOrCreateDir(server.syncDir);
    } catch (e) {
      exitOnError(`Could not create dir ${server.syncDir}!`);
    }
    fork('./src/server.js', {
      env: {
        SERVER_PORT: server.port,
        SERVER_SYNC_DIR: server.syncDir,
      },
      signal: ac.signal,
    })
      .on('error', () => exitOnError('Could not spawn server process!'))
      .on('exit', () => exitOnError('Server exited on error!'));
  }

  if (client.start) {
    try {
      await checkOrCreateDir(client.syncDir);
    } catch (e) {
      exitOnError(`Could not create dir ${client.syncDir}!`);
    }
    fork('./src/client.js', {
      env: {
        CLIENT_PORT: client.port,
        CLIENT_REMOTE_HOST: client.remoteHost,
        CLIENT_SYNC_DIR: client.syncDir,
      },
      signal: ac.signal,
    })
      .on('error', () => exitOnError('Could not spawn client process!'))
      .on('exit', () => exitOnError('Client exited on error!'));
  }
})();

process.on('exit', () => {
  ac.abort();
});
