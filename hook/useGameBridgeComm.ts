import { useEffect, useCallback, useRef } from 'react';
import { GameBridgeMessage, GameBridgeMessageType } from './types';

interface UseGameBridgeComm {
  sendMessage: (message: GameBridgeMessage) => void;
  addMessageListener: (handler: (message: GameBridgeMessage) => void) => () => void;
}

export const useGameBridgeComm = (
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
): UseGameBridgeComm => {
  const listenersRef = useRef<Set<(message: GameBridgeMessage) => void>>(new Set());

  const sendMessage = useCallback((message: GameBridgeMessage) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    console.log('Sending message to iframe:', messageWithTimestamp);

    if (iframeRef?.current?.contentWindow) {
      // Parent to child
      iframeRef.current.contentWindow.postMessage(messageWithTimestamp, '*');
    } else {
      // Child to parent (if this hook is used in child iframe)
      window.parent.postMessage(messageWithTimestamp, '*');
    }
  }, [iframeRef]);

  const addMessageListener = useCallback((
    handler: (message: GameBridgeMessage) => void
  ) => {
    listenersRef.current.add(handler);

    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // For now, we're not strictly checking origin as requested
      // In production, you might want to validate allowed origins
      
      const message = event.data as GameBridgeMessage;
      
      // Validate message structure
      if (!message || typeof message !== 'object' || !message.type) {
        console.warn('Invalid message received:', message);
        return;
      }

      console.log('Received message from iframe:', message);

      // Notify all listeners
      listenersRef.current.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return { sendMessage, addMessageListener };
};
