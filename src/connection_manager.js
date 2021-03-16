import { syncDir } from './util.js';

class ConnectionManager {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.connections = new Set();
  }

  async addConnection(agent) {
    this.connections.add(agent);
    agent.on('handshake', async () => {
      await agent.startTransaction();
      await syncDir(this.rootDir, agent);
      await agent.endTransaction();
    });
    agent.on('end', () => this.removeConnection(agent));
  }

  removeConnection(agent) {
    this.connections.delete(agent);
  }
}

export default ConnectionManager;
