import Connector, { IConnector } from '../models/Connector';
import { ConnectorModel, IConnectorModel } from '../models/ConnectorModel';
import ConnectorUser, { IConnectorUser } from '../models/ConnectorUser';
import UserConnectorModel, { IUserConnectorModel } from '../models/UserConnectorModel';
import { LambdaValidationService } from './aws/lambdaValidationService';

export class ConnectorService {
  /**
   * Get default models for a given LLM name
   */
  private static getDefaultModels(llmName: string): string[] {
    const models: { [key: string]: string[] } = {
      'qwen': ['Qwen-14b-Instruct'],
      'openai': ['gpt-4', 'gpt-4o', 'gpt-3.5', 'gpt-4o-mini'],
      'gemini': ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'],
      'cerebras': ['cerebras-llama3.1-8b', 'cerebras-llama3.3-70b'],
    };
    return models[llmName] || [];
  }

  /**
   * Create a new connector with default models
   */
  static async createConnector(data: { llmName: string; description?: string }): Promise<IConnector> {
    const connector = await Connector.create(data);
    
    const defaultModels = this.getDefaultModels(data.llmName);
    const models = defaultModels.map(model => ({
      connectorId: connector.id!,
      model,
    }));
    
    await ConnectorModel.createMany(models);
    
    return connector;
  }

  /**
   * Connect a user to a connector (purchase API key or activate default model)
   */
  static async connectUser(
    userId: number,
    connectorId: number,
    apiKey: string | null = null
  ): Promise<IConnectorUser> {
    const connector = await Connector.findById(connectorId);
    if (!connector) {
      throw new Error('Connector not found');
    }

    // Deactivate all user models first
    await UserConnectorModel.deactivateAllForUser(userId);

    if (connector.llmName === 'qwen') {
      // Qwen is the default model - no API key required
      if (apiKey !== null) {
        throw new Error('Qwen is a default model and does not require an API key');
      }

      // Check if user already has active qwen connection
      const existingQwen = await ConnectorUser.findByUserAndConnector(userId, connectorId);
      if (existingQwen && existingQwen.isActive) {
        throw new Error('Qwen integration is already active');
      }

      // Create or update connector user
      const connectorUser = await ConnectorUser.updateOrCreate(userId, connectorId, {
        apiKey: null,
        isActive: true,
      });

      // Activate all qwen models for the user
      const qwenModels = await ConnectorModel.findByConnectorId(connectorId);
      for (const model of qwenModels) {
        await UserConnectorModel.updateOrCreate(userId, connectorId, model.id!, {
          isActive: true,
        });
      }

      return connectorUser;
    } else {
      // Third-party connector - API key required
      if (!apiKey) {
        throw new Error('API key is required for this connector');
      }

      // Check if user already has active connection
      const existingConnection = await ConnectorUser.findByUserAndConnector(userId, connectorId);
      if (existingConnection && existingConnection.isActive) {
        throw new Error('This integration is already active');
      }

      if (existingConnection && existingConnection.apiKey !== apiKey) {
        throw new Error('Invalid API key to reactivate the Model');
      }

      // Create or update connector user (temporarily inactive until validated)
      const connectorUser = await ConnectorUser.updateOrCreate(userId, connectorId, {
        apiKey,
        isActive: false, // Set to false initially, will be set to true after validation
      });

      if (!connectorUser.id) {
        throw new Error('Failed to create connector user');
      }

      // Validate API key using Lambda
      const validationResponse = await LambdaValidationService.validateApiKey(
        1, // Use a default KB ID for validation
        connector.llmName,
        connectorUser.id
      );

      // Handle validation response
      let isValid = false;
      if (typeof validationResponse === 'string') {
        try {
          const parsed = JSON.parse(validationResponse);
          isValid = parsed.valid || parsed.message?.toLowerCase().includes('successfully');
        } catch (e) {
          isValid = validationResponse.toLowerCase().includes('successfully');
        }
      } else {
        isValid = validationResponse.valid || validationResponse.message?.toLowerCase().includes('successfully') || !validationResponse.error;
      }

      if (!isValid) {
        await ConnectorUser.delete(connectorUser.id);
        await this.ensureQwenModelActive(userId);
        throw new Error('Invalid API key. Please provide a valid API key to proceed.');
      }

      // API key is valid, activate the connector user
      await ConnectorUser.update(connectorUser.id, { isActive: true });
      connectorUser.isActive = true;

      // Add all models for this connector (but mark them as inactive)
      const models = await ConnectorModel.findByConnectorId(connectorId);
      for (const model of models) {
        await UserConnectorModel.updateOrCreate(userId, connectorId, model.id!, {
          isActive: false,
        });
      }

      // Ensure qwen model is also active as fallback
      await this.ensureQwenModelActive(userId);

      return connectorUser;
    }
  }

  /**
   * Switch active model for a user
   */
  static async switchModel(
    userId: number,
    llmName: string,
    modelName: string,
    isActive: boolean
  ): Promise<IConnectorModel> {
    const connector = await Connector.findByLlmName(llmName);
    if (!connector) {
      throw new Error('Connector not found');
    }

    const connectorUser = await ConnectorUser.findByUserAndConnector(userId, connector.id!);
    if (!connectorUser || !connectorUser.isActive) {
      throw new Error('LLM name is inactive. Cannot activate the model.');
    }

    const model = await ConnectorModel.findByConnectorId(connector.id!);
    const targetModel = model.find(m => m.model === modelName);
    if (!targetModel) {
      throw new Error('Model not found');
    }

    if (isActive) {
      // Deactivate all user models
      await UserConnectorModel.deactivateAllForUser(userId);
      
      // Activate the selected model
      await UserConnectorModel.updateOrCreate(userId, connector.id!, targetModel.id!, {
        isActive: true,
      });
    }

    return targetModel;
  }

  /**
   * Get active model for a user
   */
  static async getActiveModel(userId: number): Promise<IUserConnectorModel | null> {
    return await UserConnectorModel.findActiveByUserId(userId);
  }

  /**
   * Ensure qwen model is active for a user (fallback default)
   */
  static async ensureQwenModelActive(userId: number): Promise<void> {
    const qwenConnector = await Connector.findByLlmName('qwen');
    if (!qwenConnector) {
      return;
    }

    // Check if user has any other active model
    const activeModel = await UserConnectorModel.findActiveByUserId(userId);
    if (activeModel && activeModel.connectorId !== qwenConnector.id) {
      return; // User has another active model, don't activate qwen
    }

    // Activate qwen models
    const qwenModels = await ConnectorModel.findByConnectorId(qwenConnector.id!);
    for (const model of qwenModels) {
      await UserConnectorModel.updateOrCreate(userId, qwenConnector.id!, model.id!, {
        isActive: true,
      });
    }
  }

  /**
   * Delete user's connection to a connector
   */
  static async disconnectUser(userId: number, connectorId: number): Promise<void> {
    const connectorUser = await ConnectorUser.findByUserAndConnector(userId, connectorId);
    if (!connectorUser) {
      throw new Error('Integration not found');
    }

    // Delete user connector models
    await UserConnectorModel.deleteByUserAndConnector(userId, connectorId);
    
    // Delete connector user
    await ConnectorUser.delete(connectorUser.id!);
    
    // Ensure qwen is active as fallback
    await this.ensureQwenModelActive(userId);
  }

  /**
   * Update connector connection (API key, dialogue mode, etc.)
   */
  static async updateConnection(
    userId: number,
    connectorId: number,
    updates: { apiKey?: string; isActive?: boolean; dialogueMode?: string }
  ): Promise<IConnectorUser> {
    const connector = await Connector.findById(connectorId);
    if (!connector) {
      throw new Error('Connector not found');
    }

    if (updates.apiKey !== undefined && connector.llmName !== 'qwen') {
      // Get existing connector user or create a temporary one for validation
      let connectorUser = await ConnectorUser.findByUserAndConnector(userId, connectorId);
      
      // If doesn't exist, create it temporarily with isActive=false
      if (!connectorUser) {
        connectorUser = await ConnectorUser.create({
          userId,
          connectorId,
          apiKey: updates.apiKey,
          isActive: false,
        });
      } else {
        // Update with new API key temporarily
        connectorUser = await ConnectorUser.update(connectorUser.id!, {
          apiKey: updates.apiKey,
          isActive: false,
        });
      }

      // Ensure connectorUser is not null after create/update
      if (!connectorUser || !connectorUser.id) {
        throw new Error('Failed to create/update connector user for validation');
      }

      // Validate new API key
      const validationResponse = await LambdaValidationService.validateApiKey(
        1,
        connector.llmName,
        connectorUser.id
      );

      let isValid = false;
      if (typeof validationResponse === 'string') {
        try {
          const parsed = JSON.parse(validationResponse);
          isValid = parsed.valid || parsed.message?.toLowerCase().includes('successfully');
        } catch (e) {
          isValid = validationResponse.toLowerCase().includes('successfully');
        }
      } else {
        isValid = validationResponse.valid || validationResponse.message?.toLowerCase().includes('successfully') || !validationResponse.error;
      }

      if (!isValid) {
        // If validation fails, ensure we clean up if this was a temporary connection
        await ConnectorUser.delete(connectorUser.id);
        throw new Error('Invalid API key. Please provide a valid API key to proceed.');
      }

      // Validation successful, ensure it's active if requested
      if (updates.isActive !== false) {
        updates.isActive = true;
      }
    }

    // Update with final values (including isActive if provided)
    return await ConnectorUser.updateOrCreate(userId, connectorId, updates);
  }
}

