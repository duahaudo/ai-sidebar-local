import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, OllamaModel } from '@types';

interface SettingsProps {
  settings: SettingsType;
  onUpdate: (settings: Partial<SettingsType>) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, onClose }) => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [hasLoadedModels, setHasLoadedModels] = useState(false);

  // Load models when Settings modal opens
  useEffect(() => {
    // Load models when component mounts (Settings modal opens)
    loadModels();
  }, []); // Load once when modal opens

  const loadModels = async () => {
    setLoading(true);
    try {
      const url = settings.apiSource === 'local' 
        ? 'http://127.0.0.1:11434' 
        : settings.apiUrl;

      // Request models through background script
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_MODELS',
        url: `${url}/api/tags`
      });

      if (response.success && response.models) {
        setModels(response.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');

    try {
      const url = settings.apiSource === 'local' 
        ? 'http://127.0.0.1:11434' 
        : settings.apiUrl;

      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CONNECTION',
        url: `${url}/api/tags`
      });

      if (response.success) {
        setTestStatus('success');
        setTestMessage('✓ Connected successfully');
        loadModels();
      } else {
        throw new Error(response.error || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label>Model</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={settings.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading && <option>Loading...</option>}
                {!loading && models.length === 0 && <option value={settings.model}>{settings.model || 'No models loaded'}</option>}
                {!loading && models.map(model => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <button 
                className="refresh-btn"
                onClick={loadModels}
                disabled={loading}
                title="Refresh models"
                style={{ 
                  marginLeft: '8px',
                  padding: '6px',
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>API Source</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="api-source"
                  value="local"
                  checked={settings.apiSource === 'local'}
                  onChange={() => onUpdate({ apiSource: 'local' })}
                />
                <span>Local (127.0.0.1:11434)</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="api-source"
                  value="remote"
                  checked={settings.apiSource === 'remote'}
                  onChange={() => onUpdate({ apiSource: 'remote' })}
                />
                <span>Remote</span>
              </label>
            </div>
          </div>

          {settings.apiSource === 'remote' && (
            <div className="setting-group">
              <label>Remote URL</label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => onUpdate({ apiUrl: e.target.value })}
                placeholder="http://100.x.x.x:11434"
              />
              <button 
                className="test-btn"
                onClick={testConnection}
                disabled={testStatus === 'testing'}
              >
                Test Connection
              </button>
              {testStatus !== 'idle' && (
                <div className={`test-result ${testStatus}`}>
                  {testMessage}
                </div>
              )}
            </div>
          )}

          <div className="setting-group">
            <label>Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => onUpdate({ theme: e.target.value as 'light' | 'dark' })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};