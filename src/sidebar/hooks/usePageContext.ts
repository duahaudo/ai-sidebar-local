import { useCallback } from 'react';

export const usePageContext = () => {
  const extractPageContext = useCallback(async (): Promise<string> => {
    try {
      // Request context from content script through background
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PAGE_CONTEXT'
      });

      if (response && response.context) {
        return response.context;
      }

      return '';
    } catch (error) {
      console.error('Failed to extract page context:', error);
      return '';
    }
  }, []);

  return { extractPageContext };
};