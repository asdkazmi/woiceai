import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AgentService } from '../services/agentService';
import { AgentExecutionService } from '../services/agentExecutionService';

const router = express.Router();

// @route   GET /api/agents
// @desc    Get all agents for the authenticated user
// @access  Private
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const agents = await AgentService.getAll(user.id!);

    res.json({
      message: 'Agents fetched successfully',
      data: {
        agents,
      },
    });
  } catch (error: any) {
    console.error('Get agents error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/agents/:id
// @desc    Get a single agent by ID
// @access  Private
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    const agent = await AgentService.get(id, user.id!);

    if (!agent) {
      return res.status(404).json({
        message: 'Agent not found',
      });
    }

    res.json({
      message: 'Agent fetched successfully',
      data: {
        agent,
      },
    });
  } catch (error: any) {
    console.error('Get agent error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/agents
// @desc    Create a new agent
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('agentData').isObject().withMessage('Agent data is required'),
    body('agentData.nodes').isArray().withMessage('Agent data must have nodes array'),
    body('agentData.edges').isArray().withMessage('Agent data must have edges array'),
    body('description').optional().isString(),
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

      const agent = await AgentService.create(user.id!, {
        name: req.body.name,
        description: req.body.description,
        agentData: req.body.agentData,
      });

      res.status(201).json({
        message: 'Agent created successfully',
        data: {
          agent,
        },
      });
    } catch (error: any) {
      console.error('Create agent error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   PATCH /api/agents/:id
// @desc    Update an agent
// @access  Private
router.patch(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('agentData').optional().isObject().withMessage('Agent data must be an object'),
    body('description').optional().isString(),
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
          message: 'Invalid agent ID',
        });
      }

      const agent = await AgentService.update(id, user.id!, {
        name: req.body.name,
        description: req.body.description,
        agentData: req.body.agentData,
      });

      res.json({
        message: 'Agent updated successfully',
        data: {
          agent,
        },
      });
    } catch (error: any) {
      console.error('Update agent error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   PATCH /api/agents/:id/toggle-publish
// @desc    Toggle publish status of an agent
// @access  Private
router.patch('/:id/toggle-publish', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    const agent = await AgentService.togglePublish(id, user.id!);

    res.json({
      message: 'Agent publish status updated successfully',
      data: {
        agent,
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

// @route   POST /api/agents/:id/execute
// @desc    Execute an agent workflow
// @access  Private
router.post(
  '/:id/execute',
  authenticate,
  [
    body('input').optional().isString(),
    body('isRestart').optional().isBoolean(),
    body('executionId').optional().isInt(),
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
          message: 'Invalid agent ID',
        });
      }

      const response = await AgentExecutionService.execute(id, user.id!, {
        input: req.body.input,
        isRestart: req.body.isRestart,
        executionId: req.body.executionId,
      });

      res.json({
        message: 'Agent execution completed',
        data: {
          response,
        },
      });
    } catch (error: any) {
      console.error('Agent execution error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   POST /api/agents/:id/resume
// @desc    Resume agent execution after user input
// @access  Private
router.post(
  '/:id/resume',
  authenticate,
  [
    body('input').trim().notEmpty().withMessage('Input is required'),
    body('executionId').isInt().withMessage('Execution ID is required'),
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
          message: 'Invalid agent ID',
        });
      }

      const response = await AgentExecutionService.execute(id, user.id!, {
        input: req.body.input,
        executionId: parseInt(req.body.executionId, 10), // Ensure it's a number
      });

      res.json({
        message: 'Agent execution resumed',
        data: {
          response,
        },
      });
    } catch (error: any) {
      console.error('Agent resume error:', error);
      res.status(500).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   GET /api/agents/:id/messages
// @desc    Get chat history for an agent
// @access  Private
router.get('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const messages = await AgentExecutionService.getChatHistory(id, user.id!, limit);

    res.json({
      message: 'Messages fetched successfully',
      data: {
        messages,
      },
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   DELETE /api/agents/:id/messages
// @desc    Clear chat history for an agent
// @access  Private
router.delete('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    await AgentExecutionService.clearChatHistory(id, user.id!);

    res.json({
      message: 'Chat history cleared successfully',
    });
  } catch (error: any) {
    console.error('Clear messages error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete an agent
// @access  Private
// NOTE: This route must come after more specific routes like /:id/messages
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    const success = await AgentService.delete(id, user.id!);

    if (!success) {
      return res.status(404).json({
        message: 'Agent not found',
      });
    }

    res.json({
      message: 'Agent deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete an agent
// @access  Private
// NOTE: This route must come after more specific routes like /:id/messages
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid agent ID',
      });
    }

    const success = await AgentService.delete(id, user.id!);

    if (!success) {
      return res.status(404).json({
        message: 'Agent not found',
      });
    }

    res.json({
      message: 'Agent deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

export default router;

