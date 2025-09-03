export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
  isStreaming?: boolean;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface Settings {
  model: string;
  apiUrl: string;
  apiSource: 'local' | 'remote';
  theme: 'light' | 'dark';
}

export interface ConversationHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date | string;
  updatedAt: Date | string;
  url: string;
}