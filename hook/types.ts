export interface GameBridgeMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

export interface ReadyMessage extends GameBridgeMessage {
  type: 'ready';
  payload: {
    gameName: string;
  };
}

export interface AuthMessage extends GameBridgeMessage {
  type: 'auth';
  payload: {
    gameName: string;
    signature: string;
    message: string;
    timestamp: number;
    walletAddress: string;
  };
}

export interface UpdateMessage extends GameBridgeMessage {
  type: 'update';
  payload: {
    gameName: string;
    currentNonce: number;
    gamePoints: number;
  };
}

export interface ErrorMessage extends GameBridgeMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: any;
  };
}

export type GameBridgeMessageType = ReadyMessage | AuthMessage | ErrorMessage;
