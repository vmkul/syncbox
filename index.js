import { readFile, mkdir, opendir } from 'fs/promises';
import { fork } from 'child_process';

const loadConfig = async path => {
  const raw = await readFile(path);
  return JSON.parse(raw.toString());
};

const checkOrCreateDir = async path => {
  try {
    await (await opendir(path)).close();
  } catch (e) {
    await mkdir(path);
  }
};

(async () => {
  const config = await loadConfig('config.json');
  const { client, server } = config;

  if (server.start) {
    await checkOrCreateDir(server.syncDir);
    fork('./src/server.js', {
      env: {
        SERVER_PORT: server.port,
        SERVER_SYNC_DIR: server.syncDir,
      },
    });
  }

  if (client.start) {
    await checkOrCreateDir(client.syncDir);
    fork('./src/client.js', {
      env: {
        CLIENT_PORT: client.port,
        CLIENT_REMOTE_HOST: client.remoteHost,
        CLIENT_SYNC_DIR: client.syncDir,
      },
    });
  }
})();
