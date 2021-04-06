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
    process.env.SERVER_PORT = server.port;
    process.env.SERVER_SYNC_DIR = server.syncDir;
    fork('./src/server.js');
  }

  if (client.start) {
    await checkOrCreateDir(client.syncDir);
    process.env.CLIENT_PORT = client.port;
    process.env.CLIENT_REMOTE_HOST = client.remoteHost;
    process.env.CLIENT_SYNC_DIR = client.syncDir;
    fork('./src/client.js');
  }
})();
