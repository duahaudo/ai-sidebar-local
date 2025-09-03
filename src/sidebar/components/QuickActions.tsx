import React from 'react';

interface QuickActionsProps {
  onSummarize: () => void;
  onExtractKeys: () => void;
  onNewChat: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSummarize,
  onExtractKeys,
  onNewChat
}) => {
  return (
    <div className="quick-actions">
      <button 
        className="quick-action-btn"
        onClick={onNewChat}
        title="Start new conversation"
      >
        <span className="icon">➕</span>
        <span className="label">New</span>
      </button>
      <button 
        className="quick-action-btn"
        onClick={onSummarize}
        title="Summarize page content"
      >
        <span className="icon">📝</span>
        <span className="label">Summarize</span>
      </button>
      <button 
        className="quick-action-btn"
        onClick={onExtractKeys}
        title="Extract key points"
      >
        <span className="icon">🔑</span>
        <span className="label">Key Points</span>
      </button>
    </div>
  );
};