#!/bin/bash

# Start Ollama with CORS enabled for Chrome extension
echo "Starting Ollama with CORS enabled..."
echo "This allows the Chrome extension to connect to Ollama"
echo ""

# Set environment variables to allow CORS
export OLLAMA_ORIGINS="chrome-extension://*"
export OLLAMA_HOST="127.0.0.1:11434"

# Start Ollama serve
ollama serve

echo ""
echo "Ollama started with CORS enabled for Chrome extensions"
echo "You can now use the AI Assistant sidebar"