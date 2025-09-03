import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Message } from '@types';
import clsx from 'clsx';

interface MessageListProps {
  messages: Message[];
  showThinking?: boolean;
  onEditMessage?: (messageId: string, content: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, showThinking = true, onEditMessage }) => {
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      // Extract main content without thinking tags
      const { mainContent } = extractThinkingContent(content);
      
      // Remove HTML tags for plain text copy
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = DOMPurify.sanitize(marked.parse(mainContent) as string);
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(plainText);
      setCopiedMessageId(messageId);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const extractThinkingContent = (content: string, isStreaming?: boolean) => {
    // Check if content contains <thinking> tags (complete or partial during streaming)
    const completeThinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (completeThinkingMatch) {
      const thinking = completeThinkingMatch[1].trim();
      const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
      return { thinking, mainContent, isInThinking: false };
    }
    
    // Check for partial thinking tag during streaming
    const partialThinkingMatch = content.match(/<thinking>([\s\S]*?)$/);
    if (partialThinkingMatch && isStreaming) {
      const thinking = partialThinkingMatch[1].trim();
      const mainContent = content.substring(0, content.indexOf('<thinking>'));
      return { thinking, mainContent: mainContent.trim(), isInThinking: true };
    }
    
    // No thinking tags found, return content as-is
    return { thinking: null, mainContent: content, isInThinking: false };
  };
  
  const renderMessageContent = (content: string, isStreaming?: boolean, messageId?: string) => {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Extract thinking content if present
    const { thinking, mainContent, isInThinking } = extractThinkingContent(content, isStreaming);
    const isExpanded = messageId ? expandedThinking.has(messageId) : false;
    
    // Auto-expand thinking during streaming if it's being generated
    const shouldShowThinking = isExpanded || (isStreaming && isInThinking);

    // Parse markdown and sanitize
    const parseAndSanitize = (text: string) => {
      const rawHtml = marked.parse(text) as string;
      return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
          'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
          'sup', 'sub'
        ],
        ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title'],
      });
    };

    const cleanMainHtml = parseAndSanitize(mainContent);

    return (
      <div className={clsx('message-content', { 'streaming': isStreaming })}>
        {thinking && messageId && showThinking && (
          <div className="thinking-section">
            <button 
              className="thinking-toggle"
              onClick={() => toggleThinking(messageId)}
              type="button"
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
              >
                <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>💭 Thinking Process</span>
            </button>
            {shouldShowThinking && (
              <div className="thinking-content">
                <div className="thinking-text">
                  {thinking}
                  {isStreaming && isInThinking && <span className="thinking-cursor">▊</span>}
                </div>
              </div>
            )}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: cleanMainHtml }} />
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="empty-state">
          <p>👋 Hi! I'm your AI assistant.</p>
          <p>Ask me anything about this page, or use the quick actions above to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={clsx('message', message.role, {
            'streaming': message.isStreaming
          })}
        >
          <div className="message-bubble">
            {message.role === 'assistant' && message.isStreaming && !message.content && (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            {message.content && renderMessageContent(message.content, message.isStreaming, message.id)}
            {message.role === 'user' && message.content && !message.isStreaming && (
              <button
                className="edit-button"
                onClick={() => onEditMessage?.(message.id, message.content)}
                title="Edit message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {message.role === 'assistant' && message.content && !message.isStreaming && (
              <button
                className={clsx('copy-button', {
                  'copied': copiedMessageId === message.id
                })}
                onClick={() => handleCopyMessage(message.id, message.content)}
                title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
              >
                {copiedMessageId === message.id ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};