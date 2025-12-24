import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ChatAIService } from '../services/chatAIService';
import { ChatAIMessage } from '../models/ChatAIMessage';

const router = express.Router();

// @route   GET /api/chat-ai/knowledge-base/:knowledgeBaseId
// @desc    Get all chat AIs for a knowledge base
// @access  Private
router.get('/knowledge-base/:knowledgeBaseId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const knowledgeBaseId = parseInt(req.params.knowledgeBaseId);

    if (isNaN(knowledgeBaseId)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    const chatAIs = await ChatAIService.getAllByKnowledgeBase(knowledgeBaseId, user.id!);

    res.json({
      message: 'Chat AIs fetched successfully',
      data: {
        chatAIs,
      },
    });
  } catch (error: any) {
    console.error('Get chat AIs error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/chat-ai/:id
// @desc    Get a single chat AI by ID
// @access  Private
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid chat AI ID',
      });
    }

    const chatAI = await ChatAIService.get(id, user.id!);

    if (!chatAI) {
      return res.status(404).json({
        message: 'Chat AI not found',
      });
    }

    res.json({
      message: 'Chat AI fetched successfully',
      data: {
        chatAI,
      },
    });
  } catch (error: any) {
    console.error('Get chat AI error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/chat-ai
// @desc    Create a new chat AI
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('knowledgeBaseId').isInt().withMessage('Knowledge base ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    body('llmName').trim().notEmpty().withMessage('LLM name is required'),
    body('modelName').trim().notEmpty().withMessage('Model name is required'),
    body('settings').isObject().withMessage('Settings must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const knowledgeBaseId = parseInt(req.body.knowledgeBaseId);

      if (isNaN(knowledgeBaseId)) {
        return res.status(400).json({
          message: 'Invalid knowledge base ID',
        });
      }

      const chatAI = await ChatAIService.create(knowledgeBaseId, user.id!, {
        name: req.body.name,
        llmName: req.body.llmName,
        modelName: req.body.modelName,
        settings: req.body.settings || {},
      });

      res.status(201).json({
        message: 'Chat AI created successfully',
        data: {
          chatAI,
        },
      });
    } catch (error: any) {
      console.error('Create chat AI error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   PATCH /api/chat-ai/:id
// @desc    Update a chat AI
// @access  Private
router.patch(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().isLength({ max: 255 }),
    body('llmName').optional().trim().notEmpty(),
    body('modelName').optional().trim().notEmpty(),
    body('settings').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          message: 'Invalid chat AI ID',
        });
      }

      const chatAI = await ChatAIService.update(id, user.id!, {
        name: req.body.name,
        llmName: req.body.llmName,
        modelName: req.body.modelName,
        settings: req.body.settings,
      });

      if (!chatAI) {
        return res.status(404).json({
          message: 'Chat AI not found',
        });
      }

      res.json({
        message: 'Chat AI updated successfully',
        data: {
          chatAI,
        },
      });
    } catch (error: any) {
      console.error('Update chat AI error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   DELETE /api/chat-ai/:id
// @desc    Delete a chat AI
// @access  Private
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid chat AI ID',
      });
    }

    const deleted = await ChatAIService.delete(id, user.id!);

    if (!deleted) {
      return res.status(404).json({
        message: 'Chat AI not found',
      });
    }

    res.json({
      message: 'Chat AI deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete chat AI error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   PATCH /api/chat-ai/:id/toggle-publish
// @desc    Toggle publish status of a chat AI
// @access  Private
router.patch('/:id/toggle-publish', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid chat AI ID',
      });
    }

    // Verify ownership
    const chatAI = await ChatAIService.get(id, user.id!);
    if (!chatAI) {
      return res.status(404).json({
        message: 'Chat AI not found',
      });
    }

    // Toggle publish status
    const updatedChatAI = await ChatAIService.togglePublish(id, user.id!);

    res.json({
      message: 'Chat AI publish status updated successfully',
      data: {
        chatAI: updatedChatAI,
      },
    });
  } catch (error: any) {
    console.error('Toggle publish error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/chat-ai/:id/chat
// @desc    Execute a chat query using the chat AI
// @access  Private
router.post(
  '/:id/chat',
  authenticate,
  [
    body('query').trim().notEmpty().withMessage('Query is required'),
    body('history').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          message: 'Invalid chat AI ID',
        });
      }

      const response = await ChatAIService.chat(id, user.id!, {
        query: req.body.query,
        history: req.body.history || [],
      });

      res.json({
        message: 'Chat query executed successfully',
        data: {
          response,
        },
      });
    } catch (error: any) {
      console.error('Chat query error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   GET /api/chat-ai/:id/messages
// @desc    Get all messages for a chat AI
// @access  Private
router.get('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid chat AI ID',
      });
    }

    // Verify ownership
    const chatAI = await ChatAIService.get(id, user.id!);
    if (!chatAI) {
      return res.status(404).json({
        message: 'Chat AI not found',
      });
    }

    const messages = await ChatAIMessage.findByChatAIId(id);

    res.json({
      message: 'Messages fetched successfully',
      data: {
        messages,
      },
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/chat-ai/:id/messages
// @desc    Save a message for a chat AI
// @access  Private
router.post(
  '/:id/messages',
  authenticate,
  [
    body('role').isIn(['user', 'assistant']).withMessage('Role must be user or assistant'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('references').optional().isArray(),
    body('executionTime').optional().isString(),
    body('delayTime').optional().isString(),
    body('inputTokens').optional().isInt(),
    body('outputTokens').optional().isInt(),
    body('totalTokens').optional().isInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          message: 'Invalid chat AI ID',
        });
      }

      // Verify ownership
      const chatAI = await ChatAIService.get(id, user.id!);
      if (!chatAI) {
        return res.status(404).json({
          message: 'Chat AI not found',
        });
      }

      const message = await ChatAIMessage.create({
        chatAIId: id,
        role: req.body.role,
        content: req.body.content,
        references: req.body.references || null,
        executionTime: req.body.executionTime || null,
        delayTime: req.body.delayTime || null,
        inputTokens: req.body.inputTokens || null,
        outputTokens: req.body.outputTokens || null,
        totalTokens: req.body.totalTokens || null,
      });

      res.status(201).json({
        message: 'Message saved successfully',
        data: {
          message,
        },
      });
    } catch (error: any) {
      console.error('Save message error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   DELETE /api/chat-ai/:id/messages
// @desc    Delete all messages for a chat AI
// @access  Private
router.delete(
  '/:id/messages',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user!;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          message: 'Invalid chat AI ID',
        });
      }

      // Verify ownership
      const chatAI = await ChatAIService.get(id, user.id!);
      if (!chatAI) {
        return res.status(404).json({
          message: 'Chat AI not found',
        });
      }

      await ChatAIMessage.deleteByChatAIId(id);

      res.json({
        message: 'All messages deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete messages error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   DELETE /api/chat-ai/:id/messages/:messageId
// @desc    Delete a single message for a chat AI
// @access  Private
router.delete(
  '/:id/messages/:messageId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user!;
      const id = parseInt(req.params.id);
      const messageId = parseInt(req.params.messageId);

      if (isNaN(id)) {
        return res.status(400).json({
          message: 'Invalid chat AI ID',
        });
      }

      if (isNaN(messageId)) {
        return res.status(400).json({
          message: 'Invalid message ID',
        });
      }

      // Verify ownership
      const chatAI = await ChatAIService.get(id, user.id!);
      if (!chatAI) {
        return res.status(404).json({
          message: 'Chat AI not found',
        });
      }

      // Verify the message belongs to this chat AI
      const message = await ChatAIMessage.findById(messageId);
      if (!message || message.chatAIId !== id) {
        return res.status(404).json({
          message: 'Message not found',
        });
      }

      await ChatAIMessage.deleteMany([messageId]);

      res.json({
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete message error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

export default router;

