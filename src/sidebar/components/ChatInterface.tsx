import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { Message } from '@types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  showThinking?: boolean;
  editingMessage?: { id: string; content: string } | null;
  onEditMessage?: (messageId: string, content: string) => void;
  onCancelEdit?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  showThinking = true,
  editingMessage,
  onEditMessage,
  onCancelEdit
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-interface">
      <MessageList messages={messages} showThinking={showThinking} onEditMessage={onEditMessage} />
      <div ref={messagesEndRef} />
      <InputArea 
        onSend={onSendMessage}
        disabled={isLoading}
        initialValue={editingMessage?.content || ''}
        editingMessageId={editingMessage?.id || null}
        onCancelEdit={onCancelEdit}
      />
    </div>
  );
};