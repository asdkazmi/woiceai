import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { RestrictedQueryService } from '../services/restrictedQueryService';
import { KnowledgeBase } from '../models/KnowledgeBase';

const router = express.Router();

// @route   GET /api/restricted-queries
// @desc    Get all restricted queries for the authenticated user
// @access  Private
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const queries = await RestrictedQueryService.getAllByUserId(user.id!);

    res.json({
      message: 'Restricted queries retrieved successfully',
      data: queries,
    });
  } catch (error: any) {
    console.error('Get restricted queries error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/restricted-queries/knowledge-base/:kbId
// @desc    Get restricted queries for a specific knowledge base
// @access  Private
router.get('/knowledge-base/:kbId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const kbId = parseInt(req.params.kbId);

    if (isNaN(kbId)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    // Verify user owns the knowledge base
    const kb = await KnowledgeBase.findById(kbId);
    if (!kb || kb.userId !== user.id!) {
      return res.status(404).json({
        message: 'Knowledge base not found',
      });
    }

    const queryDoc = await RestrictedQueryService.getByKnowledgeBaseId(kbId, user.id!);

    res.json({
      message: 'Restricted queries retrieved successfully',
      data: queryDoc || { kbId, userId: user.id!, restricted_queries: [] },
    });
  } catch (error: any) {
    console.error('Get restricted queries error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/restricted-queries
// @desc    Store or update restricted queries for a knowledge base
// @access  Private
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const { kbId, restricted_queries } = req.body;

    if (!kbId || typeof kbId !== 'number') {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    if (!Array.isArray(restricted_queries)) {
      return res.status(400).json({
        message: 'restricted_queries must be an array',
      });
    }

    // Verify user owns the knowledge base
    const kb = await KnowledgeBase.findById(kbId);
    if (!kb || kb.userId !== user.id!) {
      return res.status(404).json({
        message: 'Knowledge base not found',
      });
    }

    const result = await RestrictedQueryService.storeOrUpdate(kbId, user.id!, restricted_queries);

    res.status(201).json({
      message: 'Restricted queries stored successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Store restricted queries error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   PUT /api/restricted-queries/knowledge-base/:kbId
// @desc    Update restricted queries for a knowledge base
// @access  Private
router.put('/knowledge-base/:kbId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const kbId = parseInt(req.params.kbId);
    const { restricted_queries } = req.body;

    if (isNaN(kbId)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    if (!Array.isArray(restricted_queries)) {
      return res.status(400).json({
        message: 'restricted_queries must be an array',
      });
    }

    // Verify user owns the knowledge base
    const kb = await KnowledgeBase.findById(kbId);
    if (!kb || kb.userId !== user.id!) {
      return res.status(404).json({
        message: 'Knowledge base not found',
      });
    }

    const result = await RestrictedQueryService.storeOrUpdate(kbId, user.id!, restricted_queries);

    res.json({
      message: 'Restricted queries updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Update restricted queries error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   DELETE /api/restricted-queries/knowledge-base/:kbId
// @desc    Delete all restricted queries for a knowledge base
// @access  Private
router.delete('/knowledge-base/:kbId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const kbId = parseInt(req.params.kbId);

    if (isNaN(kbId)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    // Verify user owns the knowledge base
    const kb = await KnowledgeBase.findById(kbId);
    if (!kb || kb.userId !== user.id!) {
      return res.status(404).json({
        message: 'Knowledge base not found',
      });
    }

    const deleted = await RestrictedQueryService.delete(kbId, user.id!);

    res.json({
      message: deleted ? 'Restricted queries deleted successfully' : 'No restricted queries found',
    });
  } catch (error: any) {
    console.error('Delete restricted queries error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

export default router;

