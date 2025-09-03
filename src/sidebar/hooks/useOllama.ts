import { useCallback } from 'react';
import { Settings } from '@types';

export const useOllama = (settings: Settings) => {
  const streamMessage = useCallback(async (
    message: string,
    context: string,
    conversationHistory: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Create a connection to background script
      const port = chrome.runtime.connect({ name: 'ollama-stream' });

      // Prepare the full prompt with context
      const fullPrompt = context 
        ? `Based on the following context, answer my question.\n\n---CONTEXT---\n${context}\n---END CONTEXT---\n\nQUESTION: ${message}`
        : message;

      // Send request to background script
      port.postMessage({
        type: 'STREAM_REQUEST',
        payload: {
          message: fullPrompt,
          conversationHistory: conversationHistory,
          model: settings.model || 'llama3.2:latest',
          apiUrl: settings.apiSource === 'local' 
            ? 'http://127.0.0.1:11434'
            : settings.apiUrl
        }
      });

      // Handle responses
      port.onMessage.addListener((msg) => {
        switch (msg.type) {
          case 'STREAM_CHUNK':
            onChunk(msg.chunk);
            break;
          
          case 'STREAM_END':
            port.disconnect();
            resolve();
            break;
          
          case 'STREAM_ERROR':
            port.disconnect();
            reject(new Error(msg.error));
            break;
        }
      });

      // Handle port disconnect
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        }
      });
    });
  }, [settings]);

  return { streamMessage };
};