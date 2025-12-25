import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUrlTree, getUrlTreeByDocumentId, buildTreeStructure } from '../services/mongodbService';
import { KnowledgeBaseContent } from '../models/KnowledgeBase';

const router = express.Router();

// @route   GET /api/url-tree/by-id/:contentId
// @desc    Get URL tree structure from MongoDB by content ID (preferred method)
// @access  Private
router.get('/by-id/:contentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const parsedContentId = parseInt(contentId);

    if (isNaN(parsedContentId)) {
      return res.status(400).json({
        message: 'Invalid content ID',
      });
    }

    // Fetch the content from MySQL to get the tree_document_id
    const contentItem = await KnowledgeBaseContent.findById(parsedContentId);

    if (!contentItem) {
      return res.status(404).json({
        message: 'Content item not found',
      });
    }

    if (!contentItem.treeDocumentId) {
      return res.status(404).json({
        message: 'URL tree has not been created yet. Please wait for the scraping process to complete.',
      });
    }

    // Fetch URL tree from MongoDB using tree_document_id
    const treeDocument = await getUrlTreeByDocumentId(contentItem.treeDocumentId);

    if (!treeDocument) {
      return res.status(404).json({
        message: 'URL tree has not been created yet. Please wait for the scraping process to complete.',
      });
    }

    // Build hierarchical tree structure
    const treeStructure = buildTreeStructure(treeDocument.url, treeDocument.tree);

    res.json({
      message: 'URL tree fetched successfully by document ID',
      data: {
        rootUrl: treeDocument.url,
        tree: treeStructure,
        totalPages: treeDocument.tree.length + 1, // +1 for root URL
      },
    });
  } catch (error: any) {
    console.error('Error fetching URL tree by content ID:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/url-tree/:url
// @desc    Get URL tree structure from MongoDB by URL (fallback method)
// @access  Private
router.get('/:url', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const encodedUrl = req.params.url;
    
    // Decode the URL (it's URL-encoded)
    const url = decodeURIComponent(encodedUrl);

    if (!url) {
      return res.status(400).json({
        message: 'URL parameter is required',
      });
    }

    // Fetch URL tree from MongoDB
    const treeDocument = await getUrlTree(url);

    if (!treeDocument) {
      return res.status(404).json({
        message: 'URL tree has not been created yet. Please wait for the scraping process to complete.',
      });
    }

    // Build hierarchical tree structure
    const treeStructure = buildTreeStructure(treeDocument.url, treeDocument.tree);

    res.json({
      message: 'URL tree fetched successfully',
      data: {
        rootUrl: treeDocument.url,
        tree: treeStructure,
        totalPages: treeDocument.tree.length + 1, // +1 for root URL
      },
    });
  } catch (error: any) {
    console.error('Error fetching URL tree:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

export default router;

