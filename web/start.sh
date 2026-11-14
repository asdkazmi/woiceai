#!/bin/bash

# Woice AI - Start Script
# This script helps you start both backend and frontend servers

echo "🚀 Starting Woice AI Application..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Check if MySQL is running (check common MySQL process names)
MYSQL_RUNNING=false
if pgrep -x "mysqld" > /dev/null || pgrep -x "mysql" > /dev/null; then
    MYSQL_RUNNING=true
fi

# Also check if MySQL is accessible via socket
if [ -S /tmp/mysql.sock ] || [ -S /var/run/mysqld/mysqld.sock ]; then
    MYSQL_RUNNING=true
fi

if [ "$MYSQL_RUNNING" = false ]; then
    echo -e "${YELLOW}⚠️  Warning: MySQL doesn't appear to be running.${NC}"
    echo "   Please start MySQL before running the application."
    echo ""
    echo "   Options to start MySQL:"
    echo "   - macOS (Homebrew): brew services start mysql"
    echo "   - macOS (manual):   mysql.server start"
    echo "   - Linux:            sudo systemctl start mysql"
    echo "   - Or connect to remote MySQL server (update backend/.env)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend dependencies not found. Installing...${NC}"
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not found. Installing...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Start backend
echo ""
echo -e "${GREEN}📦 Starting Backend Server...${NC}"
cd backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating default .env file...${NC}"
    cat > .env << 'EOF'
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=woice_ai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${YELLOW}⚠️  Please update backend/.env with your MySQL password and JWT secret!${NC}"
    echo ""
fi

# Start backend in background
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Logs: tail -f backend.log"
echo ""

# Wait a bit for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}❌ Backend failed to start. Check backend.log for errors.${NC}"
    exit 1
fi

# Start frontend
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd ../frontend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating default .env file...${NC}"
    echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
fi

# Start frontend
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Logs: tail -f frontend.log"
echo ""

# Wait a bit for frontend to start
sleep 3

echo ""
echo -e "${GREEN}✨ Application is starting!${NC}"
echo ""
echo "📍 Backend:  http://localhost:5000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}To stop the servers:${NC}"
echo "   Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "   Or use: pkill -f 'ts-node.*backend' && pkill -f 'react-scripts'"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    pkill -f 'ts-node.*backend' 2>/dev/null
    pkill -f 'react-scripts' 2>/dev/null
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Wait for processes
wait
