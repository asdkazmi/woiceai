import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import Connector from '../models/Connector';
import { ConnectorService } from '../services/connectorService';
import ConnectorUser from '../models/ConnectorUser';
import UserConnectorModel from '../models/UserConnectorModel';
import { ConnectorModel } from '../models/ConnectorModel';

const router = express.Router();

// @route   GET /api/connectors
// @desc    Get all available connectors with user connection status
// @access  Private
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connectors = await Connector.findAll(true); // Include models

    // Get user connections to show connection status
    const connections = await ConnectorUser.findByUserId(user.id!);
    const userModels = await UserConnectorModel.findByUserId(user.id!);

    // Enrich connectors with user connection info (similar to Laravel)
    const connectorsWithStatus = connectors.map((connector) => {
      const connection = connections.find((c) => c.connectorId === connector.id);
      
      // For qwen, don't show user connection (it's default, no API key needed)
      if (connector.llmName === 'qwen') {
        return {
          ...connector,
          users: [], // No users relation for qwen
          // Models should show user's active models if any
          models: connector.models?.map((model) => {
            const userModel = userModels.find(
              (um) => um.modelId === model.id && um.connectorId === connector.id && um.isActive
            );
            return {
              ...model,
              is_active: userModel ? 1 : 0,
            };
          }),
        };
      }

      // For other connectors, show user connection if exists
      const connectorUsers = connection ? [connection] : [];
      
      // Add user models info to connector models
      const modelsWithStatus = connector.models?.map((model) => {
        const userModel = userModels.find(
          (um) => um.modelId === model.id && um.connectorId === connector.id && um.isActive
        );
        return {
          ...model,
          is_active: userModel ? 1 : 0,
        };
      });

      return {
        ...connector,
        users: connectorUsers.map((c) => ({
          id: c.userId,
          pivot: {
            id: c.id,
            user_id: c.userId,
            integration_id: connector.id,
            api_key: c.apiKey,
            is_active: c.isActive ? 1 : 0,
            dialogue_mode: c.dialogueMode,
          },
        })),
        models: modelsWithStatus,
      };
    });

    res.json({
      message: 'Connectors fetched successfully',
      data: connectorsWithStatus,
    });
  } catch (error: any) {
    console.error('Get connectors error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/connectors/my-connections
// @desc    Get user's connected connectors
// @access  Private
router.get('/my-connections', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connections = await ConnectorUser.findByUserId(user.id!);
    const userModels = await UserConnectorModel.findByUserId(user.id!);

    // Fetch connector details for each connection
    const connectionsWithDetails = await Promise.all(
      connections.map(async (connection) => {
        const connector = await Connector.findById(connection.connectorId, true);
        
        // Find active model for this connector
        const activeUserModel = userModels.find(
          (um) => um.connectorId === connection.connectorId && um.isActive
        );
        
        let activeModel = null;
        if (activeUserModel) {
          activeModel = await ConnectorModel.findById(activeUserModel.modelId);
        }
        
        return {
          ...connection,
          connector,
          activeModel,
        };
      })
    );

    res.json({
      message: 'User connections fetched successfully',
      data: {
        connections: connectionsWithDetails,
      },
    });
  } catch (error: any) {
    console.error('Get user connections error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/connectors/active-model
// @desc    Get user's active model
// @access  Private
router.get('/active-model', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const activeModel = await ConnectorService.getActiveModel(user.id!);

    if (!activeModel) {
      return res.status(404).json({
        message: 'No active model found',
      });
    }

    const model = await ConnectorModel.findById(activeModel.modelId);
    const connector = await Connector.findById(activeModel.connectorId);

    res.json({
      message: 'Active model retrieved successfully',
      data: {
        model: {
          ...activeModel,
          model,
          connector,
        },
      },
    });
  } catch (error: any) {
    console.error('Get active model error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/connectors/connect
// @desc    Connect user to a connector (activate with optional API key)
// @access  Private
router.post(
  '/connect',
  authenticate,
  [
    body('connectorId').isInt().withMessage('Connector ID must be an integer'),
    body('apiKey').optional().isString().withMessage('API key must be a string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const { connectorId, apiKey } = req.body;

      const connectorUser = await ConnectorService.connectUser(
        user.id!,
        connectorId,
        apiKey || null
      );

      const connector = await Connector.findById(connectorId, true);

      res.json({
        message: 'Connector connected successfully',
        data: {
          connection: connectorUser,
          connector,
        },
      });
    } catch (error: any) {
      console.error('Connect connector error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('already active') || error.message.includes('Invalid API key') ? 400 : 500;
      res.status(statusCode).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   POST /api/connectors/switch-model
// @desc    Switch user's active model
// @access  Private
router.post(
  '/switch-model',
  authenticate,
  [
    body('llmName').isString().notEmpty().withMessage('LLM name is required'),
    body('modelName').isString().notEmpty().withMessage('Model name is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const { llmName, modelName, isActive } = req.body;

      const model = await ConnectorService.switchModel(
        user.id!,
        llmName,
        modelName,
        isActive
      );

      res.json({
        message: 'Model switched successfully',
        data: {
          model,
        },
      });
    } catch (error: any) {
      console.error('Switch model error:', error);
      const statusCode = error.message.includes('not found') || error.message.includes('inactive') ? 404 : 500;
      res.status(statusCode).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   PUT /api/connectors/:connectorId/update
// @desc    Update connector connection (API key, dialogue mode, etc.)
// @access  Private
router.put(
  '/:connectorId/update',
  authenticate,
  [
    body('apiKey').optional().isString().withMessage('API key must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('dialogueMode').optional().isString().withMessage('Dialogue mode must be a string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation error',
          errors: errors.array(),
        });
      }

      const user = (req as AuthRequest).user!;
      const connectorId = parseInt(req.params.connectorId);
      const { apiKey, isActive, dialogueMode } = req.body;

      const updates: any = {};
      if (apiKey !== undefined) updates.apiKey = apiKey;
      if (isActive !== undefined) updates.isActive = isActive;
      if (dialogueMode !== undefined) updates.dialogueMode = dialogueMode;

      const connectorUser = await ConnectorService.updateConnection(
        user.id!,
        connectorId,
        updates
      );

      const connector = await Connector.findById(connectorId, true);

      res.json({
        message: 'Integration updated successfully',
        data: {
          connection: connectorUser,
          connector,
        },
      });
    } catch (error: any) {
      console.error('Update connector error:', error);
      const statusCode = error.message.includes('not found') || error.message.includes('Invalid API key') ? 404 : 500;
      res.status(statusCode).json({
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   DELETE /api/connectors/:connectorId/disconnect
// @desc    Disconnect user from a connector
// @access  Private
router.delete('/:connectorId/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const connectorId = parseInt(req.params.connectorId);

    await ConnectorService.disconnectUser(user.id!, connectorId);

    res.json({
      message: 'Connector disconnected successfully',
      data: {},
    });
  } catch (error: any) {
    console.error('Disconnect connector error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      message: error.message || 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

export default router;

