import { Directory, File } from './dirtree.js';

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

export { sendAllFilesInDir, syncDir };
