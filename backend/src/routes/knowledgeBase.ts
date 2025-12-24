import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';
import { KnowledgeBaseContent } from '../models/KnowledgeBase';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Helper to handle file uploads for multiple fields
const uploadFields = upload.fields([
  { name: 'files', maxCount: 50 },
  { name: 'audios', maxCount: 50 },
  { name: 'videos', maxCount: 50 },
  { name: 'images', maxCount: 50 },
]);

// @route   GET /api/knowledge-base
// @desc    Get all knowledge bases for the authenticated user
// @access  Private
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const knowledgeBases = await KnowledgeBaseService.getAll(user.id!);

    res.json({
      message: 'Knowledge bases fetched successfully',
      data: {
        knowledgeBases,
      },
    });
  } catch (error: any) {
    console.error('Get knowledge bases error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/knowledge-base/content/:contentId
// @desc    Get text content by content ID (for text references)
// @access  Private
router.get('/content/:contentId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const contentId = parseInt(req.params.contentId);

    if (isNaN(contentId)) {
      return res.status(400).json({
        message: 'Invalid content ID',
      });
    }

    // Fetch the content
    const content = await KnowledgeBaseContent.findById(contentId);

    if (!content) {
      return res.status(404).json({
        message: 'Content not found',
      });
    }

    // Verify that the user owns the knowledge base
    const knowledgeBase = await KnowledgeBaseService.get(content.knowledgeBaseId, user.id!);
    if (!knowledgeBase) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    // Only return text content for text type references
    if (content.type !== 'text') {
      return res.status(400).json({
        message: 'Content is not a text reference',
      });
    }

    res.json({
      message: 'Content fetched successfully',
      data: {
        content: {
          id: content.id,
          textContent: content.textContent || content.content,
          title: content.filename || 'Text Reference',
        },
      },
    });
  } catch (error: any) {
    console.error('Get content error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/knowledge-base/:id
// @desc    Get a single knowledge base by ID
// @access  Private
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    const knowledgeBase = await KnowledgeBaseService.get(id, user.id!);

    if (!knowledgeBase) {
      return res.status(404).json({
        message: 'Knowledge base not found',
      });
    }

    res.json({
      message: 'Knowledge base fetched successfully',
      data: {
        knowledgeBase,
      },
    });
  } catch (error: any) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/knowledge-base
// @desc    Create a new knowledge base
// @access  Private
router.post(
  '/',
  authenticate,
  uploadFields,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('urls').optional().isArray(),
    body('urls.*.url').optional().isURL().withMessage('Invalid URL'),
    body('urls.*.depth').optional().isInt({ min: 1, max: 10 }),
    body('texts').optional().isArray(),
    body('texts.*').optional().isString().isLength({ max: 10000 }),
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
      const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

      // Parse JSON fields from request body
      let urls: any[] = [];
      let texts: any[] = [];

      if (req.body.urls) {
        try {
          urls = typeof req.body.urls === 'string' ? JSON.parse(req.body.urls) : req.body.urls;
        } catch (e) {
          urls = [];
        }
      }

      if (req.body.texts) {
        try {
          texts = typeof req.body.texts === 'string' ? JSON.parse(req.body.texts) : req.body.texts;
        } catch (e) {
          texts = [];
        }
      }

      const knowledgeBase = await KnowledgeBaseService.create(user.id!, {
        name: req.body.name,
        files: files.files || [],
        urls,
        texts,
        audios: files.audios || [],
        videos: files.videos || [],
        images: files.images || [],
        depth: req.body.depth ? parseInt(req.body.depth) : undefined,
      });

      res.status(201).json({
        message: 'Knowledge base created successfully',
        data: {
          knowledgeBase,
        },
      });
    } catch (error: any) {
      console.error('Create knowledge base error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   PATCH /api/knowledge-base/:id
// @desc    Update a knowledge base
// @access  Private
router.patch(
  '/:id',
  authenticate,
  uploadFields,
  [
    body('name').optional().trim().isLength({ max: 100 }),
    body('urls').optional(),
    body('texts').optional(),
    // Note: deleteIds validation is handled in the route handler since FormData sends it as JSON string
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
          message: 'Invalid knowledge base ID',
        });
      }

      const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};

      // Parse JSON fields from request body
      let urls: any[] = [];
      let texts: any[] = [];
      let deleteIds: number[] = [];

      if (req.body.urls) {
        try {
          urls = typeof req.body.urls === 'string' ? JSON.parse(req.body.urls) : req.body.urls;
          // Validate URLs if provided
          if (Array.isArray(urls)) {
            urls.forEach((url, index) => {
              if (typeof url === 'object' && url.url) {
                if (!/^https?:\/\/.+/.test(url.url)) {
                  throw new Error(`Invalid URL at index ${index}`);
                }
                if (url.depth && (url.depth < 1 || url.depth > 10)) {
                  throw new Error(`Invalid depth at index ${index}`);
                }
              }
            });
          }
        } catch (e) {
          return res.status(422).json({
            message: 'Validation failed',
            errors: [{ type: 'field', value: req.body.urls, msg: 'Invalid URLs format', path: 'urls', location: 'body' }],
          });
        }
      }

      if (req.body.texts) {
        try {
          texts = typeof req.body.texts === 'string' ? JSON.parse(req.body.texts) : req.body.texts;
          // Validate texts if provided
          if (Array.isArray(texts)) {
            texts.forEach((text, index) => {
              if (typeof text !== 'string' || text.length > 10000) {
                throw new Error(`Invalid text at index ${index}`);
              }
            });
          }
        } catch (e) {
          return res.status(422).json({
            message: 'Validation failed',
            errors: [{ type: 'field', value: req.body.texts, msg: 'Invalid texts format', path: 'texts', location: 'body' }],
          });
        }
      }

      if (req.body.deleteIds) {
        try {
          if (typeof req.body.deleteIds === 'string') {
            // Parse JSON string
            const parsed = JSON.parse(req.body.deleteIds);
            if (Array.isArray(parsed)) {
              deleteIds = parsed.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
            } else {
              throw new Error('deleteIds must be an array');
            }
          } else if (Array.isArray(req.body.deleteIds)) {
            // Already an array
            deleteIds = req.body.deleteIds.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
          } else {
            throw new Error('deleteIds must be an array');
          }
        } catch (e: any) {
          return res.status(422).json({
            message: 'Validation failed',
            errors: [{ type: 'field', value: req.body.deleteIds, msg: e.message || 'Invalid deleteIds format', path: 'deleteIds', location: 'body' }],
          });
        }
      }

      const knowledgeBase = await KnowledgeBaseService.update(id, user.id!, {
        name: req.body.name,
        files: files.files || [],
        urls,
        texts,
        audios: files.audios || [],
        videos: files.videos || [],
        images: files.images || [],
        deleteIds: deleteIds.length > 0 ? deleteIds : undefined,
      });

      if (!knowledgeBase) {
        return res.status(404).json({
          message: 'Knowledge base not found',
        });
      }

      res.json({
        message: 'Knowledge base updated successfully',
        data: {
          knowledgeBase,
        },
      });
    } catch (error: any) {
      console.error('Update knowledge base error:', error);
      res.status(500).json({
        message: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   DELETE /api/knowledge-base/:id
// @desc    Delete a knowledge base
// @access  Private
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: 'Invalid knowledge base ID',
      });
    }

    const deleted = await KnowledgeBaseService.delete(id, user.id!);

    if (!deleted) {
      return res.status(400).json({
        message: 'Failed to delete knowledge base. Either it does not exist, you do not have permission, or some content is still being processed.',
      });
    }

    res.json({
      message: 'Knowledge base deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

export default router;

