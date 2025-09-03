# Ollama Setup for Chrome Extension

## Important: CORS Configuration Required

The Chrome extension needs Ollama to be configured with proper CORS headers to work correctly.

## Quick Start

### Option 1: Use the provided script (Recommended)
```bash
./start-ollama.sh
```

### Option 2: Manual start with environment variables
```bash
OLLAMA_ORIGINS="chrome-extension://*" OLLAMA_HOST="127.0.0.1:11434" ollama serve
```

### Option 3: Set environment variables permanently

Add to your shell profile (~/.bashrc, ~/.zshrc, etc.):
```bash
export OLLAMA_ORIGINS="chrome-extension://*"
export OLLAMA_HOST="127.0.0.1:11434"
```

Then start Ollama normally:
```bash
ollama serve
```

## Troubleshooting

### 403 Forbidden Error
If you see "API error: 403" in the console:
1. Stop Ollama if it's running (`Ctrl+C` or close the terminal)
2. Start it using one of the methods above
3. Reload the Chrome extension
4. Try again

### Connection Refused
If you can't connect at all:
1. Make sure Ollama is running
2. Check that it's running on `127.0.0.1:11434` (not localhost)
3. Try the Test Connection button in Settings

### Models Not Loading
1. Open the sidebar
2. Click the settings gear icon
3. Click the refresh button (🔄) next to the model dropdown
4. If still not working, check that Ollama is running with proper CORS settings

## Verify Setup

To verify Ollama is running correctly:
```bash
curl http://127.0.0.1:11434/api/tags
```

This should return a JSON list of your installed models.