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

export interface SignedMessage extends GameBridgeMessage {
  type: 'signed';
  payload: {
    gameName: string;
    signature: string;
    message: string;
    timestamp: number;
    walletAddress: string;
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

export type GameBridgeMessageType = ReadyMessage | SignedMessage | ErrorMessage;
