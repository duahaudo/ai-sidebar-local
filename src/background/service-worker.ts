// Background service worker for Chrome extension

interface StreamRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  model: string;
  apiUrl: string;
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Assistant Sidebar installed');
});

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
      }
    });
  }
});

// Handle messages from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CLOSE_SIDEBAR':
      // Forward to content script
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'CLOSE_SIDEBAR' });
      }
      break;

    case 'RESIZE_SIDEBAR':
      // Forward to content script
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { 
          type: 'RESIZE_SIDEBAR', 
          width: message.width 
        });
      }
      break;

    case 'GET_PAGE_CONTEXT':
      // Get active tab and forward to its content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'EXTRACT_CONTEXT' },
            (response) => {
              if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
              } else {
                sendResponse(response);
              }
            }
          );
        } else {
          sendResponse({ error: 'No active tab found' });
        }
      });
      return true; // Keep channel open for async response

    case 'FETCH_MODELS':
      // Fetch Ollama models
      fetchModels(message.url)
        .then(models => sendResponse({ success: true, models }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'TEST_CONNECTION':
      // Test Ollama connection
      testConnection(message.url)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Handle long-lived connections for streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ollama-stream') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'STREAM_REQUEST') {
        handleStreamRequest(port, message.payload);
      }
    });
  }
});

// Stream chat response from Ollama
async function handleStreamRequest(port: chrome.runtime.Port, request: StreamRequest) {
  console.log('Handling stream request:', request);
  
  try {
    const apiUrl = request.apiUrl || 'http://127.0.0.1:11434';
    const model = request.model || 'llama3.2:latest';
    
    console.log(`Connecting to Ollama at ${apiUrl} with model ${model}`);
    
    // Build the messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. When solving complex problems or reasoning through answers, '
                  + 'wrap your thinking process in <thinking></thinking> tags. Only the final answer should '
                  + 'appear outside these tags.'
      }
    ];
    
    // Add conversation history if provided
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      messages.push(...request.conversationHistory);
    }
    
    // Add the current message
    messages.push({
      role: 'user',
      content: request.message
    });
    
    // Log the full request for debugging
    const requestBody = {
      model: model,
      messages: messages,
      stream: true
    };
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error response';
      }
      console.error('Ollama API error:', response.status, errorText);
      console.error('Response headers:', [...response.headers.entries()]);
      
      // Provide more helpful error messages
      if (response.status === 403) {
        throw new Error('CORS error: Ollama needs to be started with OLLAMA_ORIGINS="chrome-extension://*" - See OLLAMA_SETUP.md for instructions');
      } else if (response.status === 404) {
        throw new Error('Ollama API not found - Make sure Ollama is running on 127.0.0.1:11434');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let finished = false;

    while (!finished) {
      const { value, done } = await reader.read();
      
      if (done) {
        finished = true;
        break;
      }

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              port.postMessage({ 
                type: 'STREAM_CHUNK', 
                chunk: json.message.content 
              });
            }
            if (json.done === true) {
              finished = true;
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('Invalid JSON in stream:', line);
          }
        }
      }
    }

    port.postMessage({ type: 'STREAM_END' });
  } catch (error) {
    console.error('Stream error:', error);
    port.postMessage({ 
      type: 'STREAM_ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Fetch available models from Ollama
async function fetchModels(url: string): Promise<any[]> {
  const response = await fetch(`${url}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  return data.models || [];
}

// Test Ollama connection
async function testConnection(url: string): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Connection failed: ${response.status}`);
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  }
});

// Export for TypeScript
export {};