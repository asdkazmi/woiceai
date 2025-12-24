import express, { Request, Response } from 'express';
import { KnowledgeBase, KnowledgeBaseContent } from '../models/KnowledgeBase';

const router = express.Router();

// SNS webhook handler function
const handleSNSWebhook = async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    console.log('SNS Webhook received:', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'x-amz-sns-message-type': req.headers['x-amz-sns-message-type'],
        'x-amz-sns-topic-arn': req.headers['x-amz-sns-topic-arn'],
      },
      bodyKeys: Object.keys(req.body || {}),
    });

    const messageType = req.headers['x-amz-sns-message-type'] as string;

    if (!messageType) {
      console.error('Missing x-amz-sns-message-type header');
      return res.status(400).json({
        message: 'Missing x-amz-sns-message-type header',
      });
    }

    // Handle SubscriptionConfirmation
    if (messageType === 'SubscriptionConfirmation') {
      const body = req.body;
      
      // Log the body structure for debugging
      console.log('SubscriptionConfirmation body:', JSON.stringify(body, null, 2));
      
      const subscribeUrl = body.SubscribeURL;

      if (!subscribeUrl) {
        return res.status(400).json({
          message: 'Missing SubscribeURL in subscription confirmation',
        });
      }

      console.log('SNS SubscriptionConfirmation received:', {
        TopicArn: body.TopicArn,
        SubscribeURL: subscribeUrl,
      });

      // Confirm the subscription by fetching the URL
      try {
        const response = await fetch(subscribeUrl);
        const responseText = await response.text();
        
        console.log('SNS Subscription confirmed:', responseText);

        return res.json({
          message: 'Subscription confirmed successfully',
          data: responseText,
        });
      } catch (error: any) {
        console.error('Error confirming SNS subscription:', error);
        return res.status(500).json({
          message: 'Failed to confirm subscription',
          error: error.message,
        });
      }
    }

    // Handle Notification
    if (messageType === 'Notification') {
      const body = req.body;
      const message = typeof body.Message === 'string' 
        ? JSON.parse(body.Message) 
        : body.Message;
      const attributes = body.MessageAttributes || {};

      console.log('SNS Notification received:', {
        TopicArn: body.TopicArn,
        MessageId: body.MessageId,
        attributes: Object.keys(attributes),
      });

      // Extract attributes (matching Laravel format)
      const knowledgebaseID = attributes['KNOWLEDGEBASE.ID']?.Value 
        ? parseInt(attributes['KNOWLEDGEBASE.ID'].Value) 
        : null;
      const content = attributes['KNOWLEDGEBASE.CONTENT']?.Value || null;
      const contentType = attributes['KNOWLEDGEBASE.CONTENT_TYPE']?.Value || null;
      const uniqueId = attributes['KNOWLEDGEBASE.UNIQUE_ID']?.Value || null;
      const status = attributes['KNOWLEDGEBASE.STATUS']?.Value || null;
      const creditsConsumed = attributes['KNOWLEDGEBASE.CREDITS_CONSUMED']?.Value 
        ? parseFloat(attributes['KNOWLEDGEBASE.CREDITS_CONSUMED'].Value) 
        : null;
      const transcription = attributes['KNOWLEDGEBASE.TRANSCRIPTION']?.Value || null;
      const explanation = attributes['KNOWLEDGEBASE.EXPLANATION']?.Value || null;
      const sceneExplanation = attributes['KNOWLEDGEBASE.SCENE_EXPLANATION']?.Value || null;
      const text = attributes['KNOWLEDGEBASE.TEXT']?.Value || null;
      const treeDocumentId = attributes['KNOWLEDGEBASE.TREE_DOCUMENT_ID']?.Value || null;

      if (!knowledgebaseID) {
        console.warn('SNS Notification: Missing knowledgebase ID');
        return res.status(400).json({
          message: 'Missing knowledgebase ID',
        });
      }

      // Find the knowledge base
      const knowledgebase = await KnowledgeBase.findById(knowledgebaseID, false);

      if (!knowledgebase) {
        console.warn('SNS Notification: Knowledgebase not found:', knowledgebaseID);
        return res.status(404).json({
          message: 'Knowledgebase not found',
        });
      }

      // TODO: Implement credits charging if needed
      // if (creditsConsumed && creditsConsumed > 0) {
      //   // Charge user logic here
      // }

      // Find the knowledge base content using UNIQUE_ID if provided, otherwise fall back to CONTENT
      // UNIQUE_ID is the primary key (id) from the knowledge_base_contents table
      let knowledgebaseContent: any = null;
      
      if (uniqueId) {
        // Use UNIQUE_ID (primary key id) to find the content item
        knowledgebaseContent = await KnowledgeBaseContent.findByUniqueId(
          knowledgebaseID,
          uniqueId
        );
      } else if (content) {
        // Fallback to using CONTENT for backward compatibility
        knowledgebaseContent = await KnowledgeBaseContent.findByKnowledgeBaseIdAndContent(
          knowledgebaseID,
          content
        );
      }

      if (!knowledgebaseContent) {
        console.warn('SNS Notification: Knowledgebase content not found:', {
          knowledgebaseID,
          uniqueId,
          content,
        });
        return res.status(404).json({
          message: 'Knowledgebase content not found',
        });
      }

      // Update the content with new status and data
      const updates: any = {};
      if (status) {
        updates.status = status;
      }
      if (transcription !== null) {
        updates.transcription = transcription;
      }
      if (explanation !== null) {
        updates.explanation = explanation;
      }
      if (sceneExplanation !== null) {
        updates.sceneExplanation = sceneExplanation;
      }
      if (text !== null) {
        updates.textContent = text;
      }
      // Only save tree_document_id if it exists and is not empty
      if (treeDocumentId !== null && treeDocumentId !== undefined && treeDocumentId.trim() !== '') {
        updates.treeDocumentId = treeDocumentId;
      }

      if (Object.keys(updates).length > 0) {
        await KnowledgeBaseContent.update(knowledgebaseContent.id!, updates);
      }

      console.log('SNS Notification: Knowledgebase content updated:', {
        knowledgebaseID,
        uniqueId,
        content,
        contentType,
        status,
        treeDocumentId,
        creditsConsumed,
      });

      // Check if all content is completed
      const incompleteExists = await KnowledgeBaseContent.hasIncompleteContent(knowledgebaseID);

      if (!incompleteExists) {
        await KnowledgeBase.update(knowledgebaseID, { status: 'indexed' });
        console.log('SNS Notification: Knowledgebase marked as completed:', knowledgebaseID);
      }

      return res.json({
        message: 'Notification processed successfully',
      });
    }

    // Unknown message type
    console.warn('SNS webhook: Unknown message type:', messageType);
    return res.status(400).json({
      message: `Unknown message type: ${messageType}`,
    });
  } catch (error: any) {
    console.error('SNS webhook error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Request headers:', req.headers);
    
    return res.status(500).json({
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack,
      }),
    });
  }
};

// Test endpoint to verify webhook is accessible
router.get('/webhook/test', (req: Request, res: Response) => {
  res.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
});

// SNS webhook endpoints - handles both SubscriptionConfirmation and Notification
// These endpoints should be publicly accessible (no auth middleware)
// Match Laravel pattern: /knowledgebase/webhook
router.post('/webhook', handleSNSWebhook);
// Also support API version for flexibility
router.post('/sns', handleSNSWebhook);

export default router;

