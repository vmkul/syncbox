import { HANDSHAKE_MESSAGE, messageType } from './constants.js';

class Message {
  constructor(type) {
    this.type = type;
  }
}

class GetFileMessage extends Message {
  constructor(path, size) {
    super(messageType.GET_FILE);
    this.path = path;
    this.size = size;
  }
}

class MakeDirMessage extends Message {
  constructor(path) {
    super(messageType.MKDIR);
    this.path = path;
  }
}

class SuccessMessage extends Message {
  constructor() {
    super(messageType.SUCCESS);
  }
}

class FailMessage extends Message {
  constructor(error = '') {
    super(messageType.FAIL);
    this.error = error;
  }
}

class HandshakeMessage extends Message {
  constructor() {
    super(messageType.HANDSHAKE);
    this.text = HANDSHAKE_MESSAGE;
  }
}

class TransactionMessage extends Message {
  constructor() {
    super(messageType.TRANSACTION);
  }
}

export {
  GetFileMessage,
  FailMessage,
  HandshakeMessage,
  MakeDirMessage,
  SuccessMessage,
  TransactionMessage,
};
