# Webhook 500 Error Troubleshooting Guide

## Common Causes

### 1. Body Parsing Issue
SNS sends webhooks with `Content-Type: text/plain` but the body is actually JSON. The middleware has been added to handle this, but if you're still getting errors, check:

**Solution**: The middleware should automatically parse text/plain as JSON. If not working, check backend logs for parsing errors.

### 2. Database Connection Issues
The webhook needs database access to update knowledge base content.

**Check**:
- Is MySQL running?
- Are database credentials correct in `.env`?
- Can the backend connect to the database?

**Test**:
```bash
# Check if backend can connect
curl http://localhost:5000/api/health
```

### 3. Missing Database Columns
The webhook tries to update `explanation` and `scene_explanation` columns.

**Check**: Look for migration errors in backend logs:
```
✅ Added explanation column to knowledge_base_contents table
✅ Added scene_explanation column to knowledge_base_contents table
```

**If missing**: The migration should run automatically on startup. Check backend logs.

### 4. SNS Message Format
SNS sends different message types. The webhook handles:
- `SubscriptionConfirmation` - When subscribing
- `Notification` - When processing content

## Debugging Steps

### Step 1: Check Backend Logs
```bash
# View backend logs
tail -f woice-ai-react-express/backend.log

# Or if running directly
# Check the terminal where backend is running
```

Look for:
- `SNS Webhook received:` - Confirms webhook is being called
- `SNS SubscriptionConfirmation received:` - Confirms subscription message
- Error messages with stack traces

### Step 2: Test Webhook Endpoint
```bash
# Test if webhook endpoint is accessible
curl https://your-ngrok-url.ngrok.io/knowledgebase/webhook/test

# Should return:
# {"message":"Webhook endpoint is accessible","timestamp":"..."}
```

### Step 3: Test with SNS Subscription Confirmation
When you subscribe to SNS, AWS sends a `SubscriptionConfirmation` message. Check logs for:
```
SNS SubscriptionConfirmation received: { TopicArn: '...', SubscribeURL: '...' }
SNS Subscription confirmed: ...
```

### Step 4: Check Database
```sql
-- Connect to MySQL
mysql -u root -p woice_ai

-- Check if columns exist
DESCRIBE knowledge_base_contents;

-- Should see:
-- explanation TEXT NULL
-- scene_explanation TEXT NULL
```

### Step 5: Manual Test
You can manually test the webhook with a curl command:

```bash
curl -X POST https://your-ngrok-url.ngrok.io/knowledgebase/webhook \
  -H "Content-Type: text/plain" \
  -H "x-amz-sns-message-type: SubscriptionConfirmation" \
  -d '{
    "Type": "SubscriptionConfirmation",
    "MessageId": "test-123",
    "TopicArn": "arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase",
    "Message": "test",
    "Timestamp": "2024-01-01T00:00:00.000Z",
    "SignatureVersion": "1",
    "Signature": "test",
    "SigningCertURL": "https://test.com/cert.pem",
    "SubscribeURL": "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:471112754613:woice-ai-knowledgebase&Token=test"
  }'
```

## Expected Behavior

### Successful Subscription
1. SNS sends `SubscriptionConfirmation` to webhook
2. Webhook logs: `SNS SubscriptionConfirmation received:`
3. Webhook fetches `SubscribeURL` to confirm
4. Webhook logs: `SNS Subscription confirmed:`
5. Returns 200 status with success message

### Successful Notification
1. SNS sends `Notification` to webhook
2. Webhook logs: `SNS Notification received:`
3. Webhook updates database
4. Webhook logs: `SNS Notification: Knowledgebase content updated:`
5. Returns 200 status with success message

## Error Messages to Look For

### "Missing x-amz-sns-message-type header"
- **Cause**: Request is not from SNS or headers are missing
- **Fix**: Ensure you're subscribing via AWS SNS, not calling manually

### "Missing SubscribeURL in subscription confirmation"
- **Cause**: SNS message format is incorrect
- **Fix**: Check if body is being parsed correctly (see body parsing section)

### "Failed to confirm subscription"
- **Cause**: Network issue fetching SubscribeURL
- **Fix**: Check internet connectivity, ngrok tunnel is active

### "Knowledgebase not found"
- **Cause**: Knowledge base ID in SNS message doesn't exist
- **Fix**: This is normal for test messages, but check if real notifications have correct IDs

### "Internal server error"
- **Cause**: Database error, parsing error, or other exception
- **Fix**: Check backend logs for full error stack trace

## Quick Fixes

### Restart Backend
```bash
cd woice-ai-react-express
# Stop current backend (Ctrl+C)
./start.sh
```

### Check ngrok
```bash
# Make sure ngrok is running
./start-ngrok.sh

# Check ngrok status
curl http://localhost:4040/api/tunnels
```

### Verify Database
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'woice_ai'"
```

## Still Having Issues?

1. **Check full error in logs**: Look for the complete stack trace
2. **Verify ngrok URL**: Make sure you're using the correct ngrok URL
3. **Test locally first**: Try calling the webhook locally before using ngrok
4. **Check SNS subscription**: Verify the subscription in AWS Console shows the correct endpoint

