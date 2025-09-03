import React, { useState, useRef, KeyboardEvent } from 'react';
import clsx from 'clsx';

interface InputAreaProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  initialValue?: string;
  editingMessageId?: string | null;
  onCancelEdit?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, disabled, initialValue = '', editingMessageId, onCancelEdit }) => {
  const [input, setInput] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update input when editing a message
  React.useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      // Focus and move cursor to end
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(initialValue.length, initialValue.length);
        handleInput();
      }
    }
  }, [initialValue, editingMessageId]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (trimmedInput && !disabled) {
      onSend(trimmedInput);
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={disabled ? "Processing..." : editingMessageId ? "Edit your message..." : "Ask a question..."}
          disabled={disabled}
          className={clsx('message-input', { 'disabled': disabled })}
          rows={1}
        />
        {editingMessageId && (
          <button
            onClick={() => {
              setInput('');
              onCancelEdit?.();
            }}
            className="cancel-edit-button"
            title="Cancel edit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className={clsx('send-button', { 'disabled': disabled || !input.trim(), 'editing': editingMessageId })}
          title={editingMessageId ? "Update message" : "Send message"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};