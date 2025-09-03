import React, { useState, useEffect, useRef } from 'react';
import { ChatInterface } from '@components/ChatInterface';
import { Settings } from '@components/Settings';
import { QuickActions } from '@components/QuickActions';
import { useOllama } from '@hooks/useOllama';
import { usePageContext } from '@hooks/usePageContext';
import { useStorage } from '@hooks/useStorage';
import { Message, ConversationHistory } from '@types';

export const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  const { settings, updateSettings, conversations, saveConversation, deleteConversation } = useStorage();
  const { streamMessage } = useOllama(settings);
  const { extractPageContext } = usePageContext();

  // Handle resize
  // Auto-save conversation when messages change
  useEffect(() => {
    if (messages.length > 0 && !messages[messages.length - 1].isStreaming) {
      saveCurrentConversation();
    }
  }, [messages]);

  // Load last conversation on mount or create new
  useEffect(() => {
    const loadLastConversation = async () => {
      try {
        const result = await chrome.storage.local.get(['lastConversationId']);
        if (result.lastConversationId && conversations.length > 0) {
          const conversation = conversations.find(c => c.id === result.lastConversationId);
          if (conversation) {
            setMessages(conversation.messages);
            setCurrentConversationId(conversation.id);
          } else {
            createNewConversation();
          }
        } else {
          createNewConversation();
        }
      } catch (error) {
        console.error('Failed to load last conversation:', error);
        createNewConversation();
      }
    };
    loadLastConversation();
  }, [conversations]);

  const createNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setCurrentConversationId(newId);
    setMessages([]);
    chrome.storage.local.set({ lastConversationId: newId });
  };

  const saveCurrentConversation = async () => {
    if (!currentConversationId || messages.length === 0) return;
    
    // Generate a better title from the first user message
    let title = 'New Conversation';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      // Take first 50 characters and clean it up
      title = content.length > 50 ? content.substring(0, 47) + '...' : content;
      // Remove line breaks and extra spaces for cleaner title
      title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Ensure messages have serializable dates
    const serializableMessages = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
    }));
    
    const existingConversation = conversations.find(c => c.id === currentConversationId);
    const conversation: ConversationHistory = {
      id: currentConversationId,
      title,
      messages: serializableMessages as Message[],
      createdAt: existingConversation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: window.location.href
    };
    
    await saveConversation(conversation);
  };

  const loadConversation = (conversation: ConversationHistory) => {
    setMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
    setShowHistory(false);
    chrome.storage.local.set({ lastConversationId: conversation.id });
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (id === currentConversationId) {
      createNewConversation();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = window.innerWidth;

    const doDrag = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX);
      const clampedWidth = Math.max(250, Math.min(600, newWidth));
      
      // Notify content script to resize
      chrome.runtime.sendMessage({
        type: 'RESIZE_SIDEBAR',
        width: clampedWidth
      });
    };

    const stopDrag = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // If editing, remove all messages from the edited message onwards
    if (editingMessage) {
      const messageIndex = messages.findIndex(m => m.id === editingMessage.id);
      if (messageIndex !== -1) {
        // Remove the edited message and all subsequent messages
        const newMessages = messages.slice(0, messageIndex);
        setMessages(newMessages);
      }
      setEditingMessage(null);
    }

    setIsLoading(true);
    
    // Get page context
    const context = await extractPageContext();
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    // Get conversation history before adding new messages
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      
      // Stream response from Ollama
      await streamMessage(
        text,
        context,
        conversationHistory,
        (chunk) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content += chunk;
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Error streaming message:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          // Show more specific error message
          if (error instanceof Error && error.message.includes('CORS')) {
            lastMsg.content = '⚠️ CORS Error: Ollama needs special configuration for Chrome extensions.\n\nPlease restart Ollama with:\nOLLAMA_ORIGINS="chrome-extension://*" ollama serve\n\nSee OLLAMA_SETUP.md for detailed instructions.';
          } else {
            lastMsg.content = `Error: ${error instanceof Error ? error.message : 'Failed to connect to Ollama. Please check settings.'}`;
          }
        }
        return newMessages;
      });
    } finally {
      // Mark streaming as complete
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.isStreaming = false;
        }
        return newMessages;
      });
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    const context = await extractPageContext();
    await handleSendMessage(`Please provide a concise summary of the following content:\n\n${context}`);
  };

  const handleExtractKeys = async () => {
    const context = await extractPageContext();
    await handleSendMessage(`Extract the key points from the following content as a bulleted list:\n\n${context}`);
  };

  const handleNewChat = () => {
    createNewConversation();
    setEditingMessage(null);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleClose = () => {
    chrome.runtime.sendMessage({ type: 'CLOSE_SIDEBAR' });
  };

  return (
    <div className={`ai-sidebar-container ${isResizing ? 'resizing' : ''}`}>
      <div 
        ref={resizeRef}
        className="resize-handle" 
        onMouseDown={handleMouseDown}
      />
      
      <div className="sidebar-header">
        <h2>AI Assistant</h2>
        <div className="header-actions">
          <button 
            className={`thinking-visibility-toggle ${showThinking ? 'active' : ''}`}
            onClick={() => setShowThinking(!showThinking)}
            title={showThinking ? "Hide thinking process" : "Show thinking process"}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 2v20M2 12h20M2 7h20M2 17h20" />
            </svg>
          </button>
          <button 
            className="history-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="Conversation History"
          >
            📜
          </button>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="close-btn"
            onClick={handleClose}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>
      </div>
      
      <QuickActions 
        onSummarize={handleSummarize}
        onExtractKeys={handleExtractKeys}
        onNewChat={handleNewChat}
      />
      
      <ChatInterface 
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        showThinking={showThinking}
        editingMessage={editingMessage}
        onEditMessage={handleEditMessage}
        onCancelEdit={handleCancelEdit}
      />
      
      {showSettings && (
        <Settings 
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {showHistory && (
        <div className="conversation-history-modal">
          <div className="modal-overlay" onClick={() => setShowHistory(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Conversation History</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="conversation-list">
              {conversations.length === 0 ? (
                <p className="no-conversations">No saved conversations</p>
              ) : (
                conversations.map(conv => (
                  <div 
                    key={conv.id} 
                    className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                  >
                    <div className="conversation-info" onClick={() => loadConversation(conv)}>
                      <h4>{conv.title}</h4>
                      <p className="conversation-meta">
                        {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messages.length} messages
                      </p>
                    </div>
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};