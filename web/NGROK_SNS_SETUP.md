# ngrok Setup for SNS Webhook

This guide explains how to set up ngrok to expose your backend server for AWS SNS topic subscriptions.

## Prerequisites

1. **ngrok installed**: If not already installed, install ngrok:
   ```bash
   # macOS
   brew install ngrok/ngrok/ngrok
   
   # Or download from: https://ngrok.com/download
   ```

2. **Backend server running**: Make sure your backend server is running on port 5000 (or the port specified in your `.env` file)

## Quick Start

1. **Start the backend server** (if not already running):
   ```bash
   cd woice-ai-react-express
   ./start.sh
   ```

2. **In a new terminal, start ngrok**:
   ```bash
   cd woice-ai-react-express
   ./start-ngrok.sh
   ```

   Or manually:
   ```bash
   ngrok http 5000
   ```

3. **Copy the ngrok URL**: ngrok will display a URL like:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:5000
   ```

4. **Use this URL for SNS subscription**: 
   - Full webhook URL: `https://abc123.ngrok.io/knowledgebase/webhook`
   - This matches the Laravel endpoint pattern: `/knowledgebase/webhook`
   - Alternative: `https://abc123.ngrok.io/api/webhook/sns` (also works)

## SNS Topic Subscription

### Using AWS Console

1. Go to AWS SNS Console
2. Select your topic: `arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase`
3. Click "Create subscription"
4. Choose protocol: **HTTPS**
5. Enter endpoint URL: `https://your-ngrok-url.ngrok.io/knowledgebase/webhook`
6. Click "Create subscription"
7. AWS will send a subscription confirmation request to your webhook
8. The webhook endpoint will automatically confirm the subscription

### Using AWS CLI

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase \
  --protocol https \
  --notification-endpoint https://your-ngrok-url.ngrok.io/knowledgebase/webhook
```

## Webhook Endpoint

The webhook endpoint is available at:
- **Primary URL** (matches Laravel): `/knowledgebase/webhook`
- **Alternative URL**: `/api/webhook/sns`
- **Method**: `POST`
- **Authentication**: None (publicly accessible, as required by SNS)

### Supported Message Types

1. **SubscriptionConfirmation**: Automatically confirms SNS subscription
2. **Notification**: Processes knowledge base content updates from Lambda

### Notification Processing

When a notification is received, the webhook will:
1. Extract knowledge base ID and content information
2. Update the knowledge base content status
3. Save transcription, explanation, and scene explanation if provided
4. Update the knowledge base status to "indexed" when all content is completed

## Important Notes

⚠️ **ngrok Free Tier Limitations**:
- URLs change every time you restart ngrok (unless you have a paid plan with a static domain)
- Free tier has connection limits
- For production, consider using a static ngrok domain or deploying to a server with a public IP

⚠️ **Security**:
- The webhook endpoint is publicly accessible (required by SNS)
- SNS validates requests using message signatures
- Consider adding additional validation if needed

## Troubleshooting

### Backend not running
If you see an error that the backend is not running:
```bash
cd woice-ai-react-express/backend
npm run dev
```

### Port already in use
If port 5000 is already in use, either:
1. Change the port in `backend/.env`: `PORT=5001`
2. Or specify a different port for ngrok: `ngrok http 5001`

### ngrok not found
Install ngrok:
```bash
brew install ngrok/ngrok/ngrok
```

### Subscription not confirming
1. Check that your backend is running and accessible
2. Verify the ngrok URL is correct
3. Check backend logs for errors
4. Ensure the webhook endpoint is accessible: `curl https://your-ngrok-url.ngrok.io/api/webhook/sns`

## Testing the Webhook

You can test the webhook endpoint manually:

```bash
# Test health endpoint
curl https://your-ngrok-url.ngrok.io/api/health

# Test webhook endpoint (will return an error without proper SNS headers, but confirms it's accessible)
curl -X POST https://your-ngrok-url.ngrok.io/knowledgebase/webhook
```

## How It Works (Same as Laravel)

The React Express backend webhook works **exactly like the Laravel app**:

1. **Webhook Endpoint**: `/knowledgebase/webhook` (matches Laravel pattern)
2. **Auto-Refresh Frontend**: The frontend automatically polls every 10 seconds to check for status updates
3. **Status Updates**: When SNS sends notifications:
   - Webhook receives the notification
   - Updates knowledge base content status in database
   - Updates transcription, explanation, and scene explanation
   - Marks knowledge base as "indexed" when all content is completed
4. **Frontend Updates**: The frontend polling (every 10 seconds) automatically picks up the changes and displays them **without page reload**

## Next Steps

After setting up ngrok and subscribing to SNS:
1. Create or update a knowledge base through the API
2. SNS will publish events to your webhook
3. The webhook will update the knowledge base content status in the database
4. The frontend will automatically show the updated status within 10 seconds (no page reload needed)
5. Monitor backend logs to see webhook activity

