#!/bin/bash

# Start Ollama with CORS enabled for Chrome extension
echo "Starting Ollama with CORS enabled..."
OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0:11434" ollama serve