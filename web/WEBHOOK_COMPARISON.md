# Webhook Implementation Comparison: Laravel vs React Express

## Endpoint Comparison

### Laravel
- **Route**: `POST /knowledgebase/webhook`
- **Controller**: `App\Http\Controllers\KnowledgeBase\WebhookController@handleLambdaWebhook`
- **CSRF**: Disabled (required for SNS)

### React Express
- **Route**: `POST /knowledgebase/webhook` ✅ (matches Laravel)
- **Alternative**: `POST /api/webhook/sns` (for flexibility)
- **Handler**: `src/routes/webhook.ts`
- **Auth**: No authentication middleware (publicly accessible, as required by SNS)

## Functionality Comparison

Both implementations handle the same SNS message types:

### 1. SubscriptionConfirmation
- **Laravel**: Automatically confirms by fetching `SubscribeURL`
- **React Express**: Automatically confirms by fetching `SubscribeURL` ✅

### 2. Notification Processing
Both implementations:
- Extract knowledge base ID from `MessageAttributes['KNOWLEDGEBASE.ID']`
- Extract content from `MessageAttributes['KNOWLEDGEBASE.CONTENT']`
- Extract status from `MessageAttributes['KNOWLEDGEBASE.STATUS']`
- Extract transcription, explanation, scene_explanation, text
- Update knowledge base content in database
- Mark knowledge base as completed when all content is processed

## Database Updates

### Fields Updated
- `status` - Content processing status
- `transcription` - Audio/video transcription
- `explanation` - Content explanation
- `scene_explanation` - Scene-by-scene explanation (for videos)
- `text_content` - Extracted text content

### Knowledge Base Status
- Updated to `indexed` when all content items are completed

## Frontend Updates

### Auto-Refresh Mechanism
Both frontends use **polling** to check for status updates:

**React Express Frontend**:
```typescript
// Auto-refresh every 10 seconds
useEffect(() => {
  const interval = setInterval(() => {
    loadKnowledgeBase();
  }, 10000);
  return () => clearInterval(interval);
}, [initialKB.id]);
```

**Result**: 
- ✅ Status updates appear automatically
- ✅ No page reload required
- ✅ Updates visible within 10 seconds of webhook processing

## Workflow

1. **User creates/updates knowledge base** → Backend publishes to SNS
2. **SNS triggers Lambda** → Lambda processes content
3. **Lambda publishes notification** → SNS sends to webhook
4. **Webhook receives notification** → Updates database
5. **Frontend polls API** → Gets updated status (every 10 seconds)
6. **User sees updated status** → No page reload needed ✅

## Key Differences

| Feature | Laravel | React Express |
|---------|---------|---------------|
| Endpoint | `/knowledgebase/webhook` | `/knowledgebase/webhook` ✅ |
| Subscription Confirmation | ✅ Automatic | ✅ Automatic |
| Notification Processing | ✅ | ✅ |
| Database Updates | ✅ | ✅ |
| Frontend Auto-Refresh | ✅ (polling) | ✅ (polling every 10s) |
| Credits Charging | ✅ | ⚠️ TODO (commented out) |

## Testing

Both implementations can be tested the same way:

1. Start backend server
2. Start ngrok: `ngrok http 5000`
3. Subscribe SNS topic to: `https://your-ngrok-url.ngrok.io/knowledgebase/webhook`
4. Create/update knowledge base
5. Watch frontend update automatically (within 10 seconds)

## Conclusion

✅ **The React Express webhook works exactly like the Laravel webhook:**
- Same endpoint pattern
- Same SNS message handling
- Same database updates
- Same frontend auto-refresh behavior
- Status updates appear without page reload

The only difference is the credits charging feature, which is marked as TODO in the React Express implementation.

