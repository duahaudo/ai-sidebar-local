import { useState, useEffect, useCallback } from 'react';
import { Settings, ConversationHistory } from '@types';

const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-oss:20b',
  apiUrl: 'http://127.0.0.1:11434',
  apiSource: 'local',
  theme: 'light'
};

export const useStorage = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadConversations();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    try {
      await chrome.storage.sync.set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const loadConversations = async () => {
    try {
      const result = await chrome.storage.local.get(['conversations']);
      if (result.conversations) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const saveConversation = useCallback(async (conversation: ConversationHistory) => {
    const updatedConversations = [conversation, ...conversations.filter(c => c.id !== conversation.id)];
    setConversations(updatedConversations);
    
    try {
      await chrome.storage.local.set({ conversations: updatedConversations });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, [conversations]);

  const deleteConversation = useCallback(async (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    
    try {
      await chrome.storage.local.set({ conversations: updatedConversations });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [conversations]);

  return {
    settings,
    updateSettings,
    conversations,
    saveConversation,
    deleteConversation
  };
};