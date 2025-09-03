# AI Assistant Sidebar Chrome Extension

A Chrome extension that adds an AI-powered sidebar to any webpage, integrating with Ollama for local/remote LLM capabilities.

## Features

- 🤖 **AI-Powered Chat**: Chat with AI using page context
- 📱 **Non-Overlapping Sidebar**: Page content shifts to accommodate sidebar (no overlay)
- 🎯 **Smart Context**: Automatically extracts page content for context-aware responses
- 📝 **Quick Actions**: Summarize page, extract key points
- 🔄 **Streaming Responses**: Real-time response streaming from Ollama
- 🎨 **Resizable Interface**: Drag to resize sidebar (250px - 600px)
- 💾 **Persistent Settings**: Saves model selection, API endpoints, and preferences

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally or remotely
- Chrome browser (or Chromium-based browser)
- Node.js 20+ and Yarn

## Installation

### 1. Build the Extension

```bash
# Install dependencies
yarn install

# Build the extension
yarn build

# Or watch for changes during development
yarn watch
```

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `ai-sidebar` folder (the root folder containing manifest.json)
5. The extension icon should appear in your toolbar

### 3. Configure Ollama

Make sure Ollama is running:
```bash
# Start Ollama (if not already running)
ollama serve

# Pull a model if you haven't already
ollama pull llama2
```

## Usage

### Opening the Sidebar

- **Click the extension icon** in the toolbar
- **Use keyboard shortcut**: `Ctrl+Shift+Y` (Windows/Linux) or `Cmd+Shift+Y` (Mac)
- **Click the popup button**: Click extension icon → "Toggle Sidebar"

### Using the Sidebar

1. **Chat**: Type your question and press Enter
2. **Quick Actions**:
   - **New**: Start a fresh conversation
   - **Summarize**: Get an AI summary of the current page
   - **Key Points**: Extract key points from the page
3. **Resize**: Drag the left edge of the sidebar to resize
4. **Settings**: Click the gear icon to configure:
   - Select Ollama model
   - Switch between local/remote Ollama
   - Configure remote URL

### Settings

- **Local Mode**: Uses `http://localhost:11434`
- **Remote Mode**: Configure custom URL (e.g., via Tailscale)
- **Model Selection**: Choose from available Ollama models

## Development

```bash
# Run in watch mode for development
yarn watch

# Type checking
yarn typecheck

# Build for production
yarn build
```

## Project Structure

```
ai-sidebar/
├── src/
│   ├── background/       # Service worker
│   ├── content/         # Content script (page adjustment)
│   ├── sidebar/         # React sidebar app
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── types/       # TypeScript types
│   │   └── styles/      # CSS styles
│   └── popup/           # Extension popup
├── dist/                # Build output
├── manifest.json        # Extension manifest
└── vite.config.ts       # Vite configuration
```

## How It Works

1. **Content Script** injects into every page and manages the sidebar iframe
2. **Page Adjuster** shifts the page content left when sidebar opens (non-overlapping)
3. **React Sidebar** runs in an iframe for complete isolation
4. **Background Worker** handles Ollama API calls and message passing
5. **Chrome Storage** persists settings and conversation history

## Troubleshooting

### Sidebar doesn't open
- Check if extension is enabled in `chrome://extensions/`
- Reload the page
- Check browser console for errors (F12)

### Ollama connection issues
- Verify Ollama is running: `ollama list`
- Check if models are available: `ollama list`
- Test connection in extension settings

### Build issues
- Ensure Node.js 20+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules && yarn install`
- Check TypeScript errors: `yarn typecheck`

## License

MIT