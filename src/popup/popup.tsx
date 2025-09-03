import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const Popup: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentModel, setCurrentModel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings || { 
        model: 'llama2', 
        apiSource: 'local',
        apiUrl: 'http://localhost:11434' 
      };
      
      setCurrentModel(settings.model);
      
      // Test connection
      const url = settings.apiSource === 'local' 
        ? 'http://localhost:11434' 
        : settings.apiUrl;
        
      const response = await fetch(`${url}/api/tags`);
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
      window.close();
    }
  };

  const openSettings = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      // Open sidebar first
      await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SIDEBAR' });
      // Then trigger settings in sidebar
      setTimeout(() => {
        window.close();
      }, 100);
    }
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h2>AI Assistant</h2>
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {loading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="popup-content">
        {currentModel && (
          <div className="model-info">
            <span className="label">Model:</span>
            <span className="value">{currentModel}</span>
          </div>
        )}

        <button className="popup-btn primary" onClick={toggleSidebar}>
          <span className="icon">💬</span>
          Toggle Sidebar
        </button>

        <button className="popup-btn" onClick={openSettings}>
          <span className="icon">⚙️</span>
          Settings
        </button>

        <div className="shortcut-info">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd>
        </div>
      </div>
    </div>
  );
};

// Render popup
const root = ReactDOM.createRoot(
  document.getElementById('popup-root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);