# Woice AI - Startup Guide

Complete guide to starting the Woice AI application on your local machine.

## Prerequisites Checklist

Before starting, ensure you have:

- ✅ **Node.js** (v20.15.1 or higher)
  ```bash
  node --version  # Should show v20.x.x or higher
  ```

- ✅ **npm** (comes with Node.js)
  ```bash
  npm --version  # Should show 10.x.x or higher
  ```

- ✅ **MySQL** (v8.0 or higher)
  ```bash
  mysql --version  # Should show 8.x.x or higher
  ```

## Step 1: Install MySQL (if not installed)

### macOS (Homebrew)
```bash
brew install mysql
brew services start mysql
```

### macOS (Manual)
Download from: https://dev.mysql.com/downloads/mysql/

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Linux (CentOS/RHEL)
```bash
sudo yum install mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

### Windows
Download MySQL Installer from: https://dev.mysql.com/downloads/installer/

## Step 2: Set MySQL Root Password (if needed)

```bash
# macOS/Linux
mysql -u root -p

# If no password is set, you can set it:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

## Step 3: Clone/Navigate to Project

```bash
cd /Users/asdkazmi/work/woice-ai/woice-ai-2.0/woice-ai-react-express
```

## Step 4: Quick Start (Recommended)

### Option A: Using the Start Script

1. **Make the script executable:**
   ```bash
   chmod +x start.sh
   ```

2. **Start MySQL (if not running):**
   ```bash
   # macOS with Homebrew
   brew services start mysql
   
   # macOS manual
   mysql.server start
   
   # Linux
   sudo systemctl start mysql
   ```

3. **Run the start script:**
   ```bash
   ./start.sh
   ```

The script will:
- Check if MySQL is running
- Install dependencies automatically
- Create `.env` files if needed
- Start both backend and frontend servers
- Show you the URLs and process IDs

4. **Update MySQL password in `.env`:**
   ```bash
   # Edit backend/.env and update DB_PASSWORD
   nano backend/.env
   # OR
   code backend/.env
   ```

5. **Restart if needed:**
   ```bash
   # Stop servers (Ctrl+C)
   # Then run again
   ./start.sh
   ```

### Option B: Manual Start

#### Start Backend

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # Copy the template or create manually
   cat > .env << 'EOF'
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
   EOF
   ```

4. **Update `.env` with your MySQL password:**
   ```bash
   # Edit .env and set DB_PASSWORD=your_actual_password
   ```

5. **Start the backend:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ MySQL connected successfully
   ✅ Database 'woice_ai' ready
   ✅ Users table created/verified
   🚀 Server running on port 5000
   ```

#### Start Frontend (in a new terminal)

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

4. **Start the frontend:**
   ```bash
   npm start
   ```

   The browser should automatically open to `http://localhost:3000`

## Step 5: Verify Everything is Working

1. **Check Backend:**
   - Open: http://localhost:5000/api/health
   - Should see: `{"status":"OK","message":"Server is running"}`

2. **Check Frontend:**
   - Open: http://localhost:3000
   - Should see the login page

3. **Test Registration:**
   - Go to: http://localhost:3000/login
   - Or use curl:
     ```bash
     curl -X POST http://localhost:5000/api/auth/register \
       -H "Content-Type: application/json" \
       -d '{
         "firstName": "John",
         "lastName": "Doe",
         "email": "test@example.com",
         "password": "password123"
       }'
     ```

## Troubleshooting

### MySQL Connection Issues

**Error: `ER_ACCESS_DENIED_ERROR`**
- Check your MySQL password in `backend/.env`
- Verify MySQL is running: `mysql.server status` or `brew services list`

**Error: `ECONNREFUSED`**
- MySQL is not running
- Start MySQL: `brew services start mysql` or `mysql.server start`

**Error: `Unknown database 'woice_ai'`**
- The database will be created automatically
- If it fails, create manually:
  ```bash
  mysql -u root -p -e "CREATE DATABASE woice_ai;"
  ```

### Port Already in Use

**Error: `Port 5000 is already in use`**
- Find and kill the process:
  ```bash
  lsof -ti:5000 | xargs kill -9
  ```

**Error: `Port 3000 is already in use`**
- Find and kill the process:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```

### Backend Won't Start

1. **Check logs:**
   ```bash
   tail -f backend.log
   ```

2. **Verify dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Check TypeScript compilation:**
   ```bash
   cd backend
   npm run build
   ```

### Frontend Won't Start

1. **Check logs:**
   ```bash
   tail -f frontend.log
   ```

2. **Clear cache and reinstall:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

## Stopping the Application

### If using start.sh script:
- Press `Ctrl+C` in the terminal
- Or run: `pkill -f 'ts-node.*backend' && pkill -f 'react-scripts'`

### If started manually:
- Backend: Press `Ctrl+C` in backend terminal
- Frontend: Press `Ctrl+C` in frontend terminal

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | *(required)* |
| `DB_NAME` | Database name | `woice_ai` |
| `JWT_SECRET` | JWT signing secret | *(change in production)* |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` |

## Next Steps

Once the application is running:

1. ✅ Test the login page at http://localhost:3000/login
2. ✅ Register a new user
3. ✅ Explore the dashboard
4. ✅ Check the API documentation

## Need Help?

- Check the logs: `tail -f backend.log` and `tail -f frontend.log`
- Verify MySQL is running: `mysql.server status`
- Check if ports are available: `lsof -i :5000` and `lsof -i :3000`

