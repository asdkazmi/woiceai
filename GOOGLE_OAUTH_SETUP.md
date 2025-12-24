# Google OAuth Setup Guide

This guide will help you set up Google Sign-In for the Woice AI application.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: "Woice AI" (or any name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "People API"
   - Click on it and click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (or Internal if using Google Workspace)
     - App name: "Woice AI"
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Add scopes: `email`, `profile`, `openid`
     - Click "Save and Continue"
     - Add test users (if in testing mode) or publish the app
     - Click "Save and Continue"

5. **Create OAuth Client ID**
   - Application type: "Web application"
   - Name: "Woice AI Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5000` (for development)
     - `http://localhost:3000` (for frontend)
     - Add your production URLs when deploying
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback`
     - Add your production callback URL when deploying
   - Click "Create"

6. **Copy Your Credentials**
   - You'll see a popup with:
     - **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
   - **Save these credentials securely!**

## Step 2: Add Credentials to Backend

1. **Open the backend `.env` file:**
   ```bash
   cd backend
   nano .env
   # or
   code .env
   ```

2. **Add the following variables:**
   ```env
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   BACKEND_URL=http://localhost:5000
   SESSION_SECRET=your-random-session-secret-here
   ```

3. **Replace the values:**
   - `GOOGLE_CLIENT_ID`: Your Google Client ID from Step 1
   - `GOOGLE_CLIENT_SECRET`: Your Google Client Secret from Step 1
   - `SESSION_SECRET`: Generate a random string (you can use: `openssl rand -base64 32`)

## Step 3: Restart the Backend

After adding the credentials, restart your backend server:

```bash
cd backend
npm run dev
```

## Step 4: Test Google Sign-In

1. **Start the frontend** (if not already running):
   ```bash
   cd frontend
   npm start
   ```

2. **Go to the login page:**
   - Open: http://localhost:3000/login

3. **Click the "Google" button**
   - You should be redirected to Google's sign-in page
   - Sign in with your Google account
   - You'll be redirected back to the app
   - You should be logged in and redirected to the dashboard

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Make sure the redirect URI in Google Console exactly matches:
  - `http://localhost:5000/api/auth/google/callback`
- Check for trailing slashes or http vs https

### Error: "invalid_client"
- **Solution**: 
  - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
  - Make sure there are no extra spaces or quotes
  - Restart the backend server after updating `.env`

### Error: "access_denied"
- **Solution**: 
  - Make sure you've added your email as a test user in OAuth consent screen
  - Or publish your app (if in production)

### User not created in database
- **Solution**: 
  - Check backend logs for errors
  - Verify MySQL is running
  - Check database connection in `.env`

## Production Setup

When deploying to production:

1. **Update Google OAuth Credentials:**
   - Add production URLs to "Authorized JavaScript origins"
   - Add production callback URL to "Authorized redirect URIs"
   - Example: `https://yourdomain.com/api/auth/google/callback`

2. **Update `.env` file:**
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   BACKEND_URL=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Publish your OAuth app** in Google Console (if not already published)

## Security Notes

- ⚠️ Never commit `.env` file to version control
- ⚠️ Keep your `GOOGLE_CLIENT_SECRET` secure
- ⚠️ Use environment variables in production
- ⚠️ Enable HTTPS in production

## Need Help?

If you encounter any issues:
1. Check the backend logs: `tail -f backend.log`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Make sure Google OAuth API is enabled in Google Cloud Console

