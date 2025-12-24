#!/bin/bash

# Woice AI - Start ngrok to expose backend for SNS webhook
# This script starts ngrok to tunnel the backend server (port 5000) to the internet

echo "🌐 Starting ngrok tunnel for backend server..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed.${NC}"
    echo ""
    echo "Please install ngrok:"
    echo "  macOS: brew install ngrok/ngrok/ngrok"
    echo "  Or visit: https://ngrok.com/download"
    exit 1
fi

# Check if backend is running on port 5000
if ! lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Backend server is not running on port 5000.${NC}"
    echo "   Please start the backend server first using: ./start.sh"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get the backend port from environment or use default
BACKEND_PORT=${PORT:-5000}

echo -e "${GREEN}🚀 Starting ngrok tunnel on port ${BACKEND_PORT}...${NC}"
echo ""
echo "📋 Your ngrok URL will be displayed below."
echo "   Use this URL for SNS topic subscription:"
echo "   Format: https://your-ngrok-url.ngrok.io/api/webhook/sns"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop ngrok${NC}"
echo ""

# Start ngrok
ngrok http ${BACKEND_PORT}

