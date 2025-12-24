# Woice AI - React + Express Application

A modern knowledge base application built with React (TypeScript) frontend and Node.js Express backend.

## Project Structure

```
woice-ai-react-express/
├── frontend/          # React TypeScript application
├── backend/          # Express.js TypeScript backend
└── README.md
```

## Prerequisites

- Node.js (v20.15.1 or higher)
- MySQL (v8.0 or higher) - running locally or remote
- npm or yarn

## Quick Start

The easiest way to start the application is using the provided start script:

```bash
# Make sure MySQL is running first
brew services start mysql  # macOS with Homebrew
# OR
mysql.server start         # macOS manual
# OR
sudo systemctl start mysql # Linux

# Then run the start script
chmod +x start.sh
./start.sh
```

This will:
- ✅ Check if MySQL is running
- ✅ Install dependencies if needed
- ✅ Create `.env` files if they don't exist
- ✅ Start both backend and frontend servers
- ✅ Show you the URLs and how to stop the servers

**Note:** Make sure to update `backend/.env` with your MySQL password before starting!

---

## Manual Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your MySQL configuration:
```env
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=woice_ai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

5. Make sure MySQL is running:
```bash
# If using local MySQL
mysql.server start

# Or use MySQL service
brew services start mysql

# Or connect to remote MySQL server
# Update DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
```

6. Create the database (optional - will be created automatically):
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS woice_ai;"
```

7. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

5. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Example Login Request

```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Example Register Request

```json
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "password123",
  "planId": 1
}
```

## Features

- ✅ User authentication (JWT)
- ✅ Login page with validation
- ✅ Protected routes
- ✅ User dashboard
- ✅ Responsive design

## Next Steps

- [ ] Add registration page
- [ ] Implement knowledge base management
- [ ] Add subscription management
- [ ] Implement chat functionality
- [ ] Add file upload capabilities

## Development

### Backend Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Frontend Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Technologies Used

### Backend
- Express.js
- TypeScript
- MySQL with mysql2
- JWT for authentication
- bcryptjs for password hashing
- express-validator for validation

### Frontend
- React 18
- TypeScript
- React Router
- Axios for API calls
- CSS3 for styling

## License

ISC

