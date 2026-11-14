import { IChatAI, ChatAI } from '../models/ChatAI';
import { KnowledgeBase, KnowledgeBaseContent } from '../models/KnowledgeBase';
import { LambdaService } from './aws/lambdaService';
import { RunpodService } from './runpodService';
import { S3Service } from './aws/s3Service';
import { ConnectorService } from './connectorService';
import { ConnectorUser } from '../models/ConnectorUser';
import { Connector } from '../models/Connector';

export interface CreateChatAIData {
  name: string;
  llmName: string;
  modelName: string;
  settings: {
    instruction?: string | null;
    externalKnowledge?: boolean;
    enableReference?: boolean;
    temperature?: number;
    topK?: number;
    topP?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    retrievalLimit?: number;
    retrievalScore?: number;
  };
}

export interface UpdateChatAIData {
  name?: string;
  llmName?: string;
  modelName?: string;
  settings?: CreateChatAIData['settings'];
}

export interface ChatRequest {
  query: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  content: string;
  references?: any[];
  executionTime?: string;
  delayTime?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export class ChatAIService {
  /**
   * Get all chat AIs for a knowledge base
   */
  static async getAllByKnowledgeBase(knowledgeBaseId: number, userId: number): Promise<IChatAI[]> {
    // Verify knowledge base ownership
    const kb = await KnowledgeBase.findById(knowledgeBaseId);
    if (!kb || kb.userId !== userId) {
      throw new Error('Knowledge base not found');
    }
    return ChatAI.findByKnowledgeBaseId(knowledgeBaseId, userId);
  }

  /**
   * Get a single chat AI by ID
   */
  static async get(id: number, userId: number): Promise<IChatAI | null> {
    const chatAI = await ChatAI.findById(id);
    if (!chatAI || chatAI.userId !== userId) {
      return null;
    }
    return chatAI;
  }

  /**
   * Create a new chat AI
   */
  static async create(
    knowledgeBaseId: number,
    userId: number,
    data: CreateChatAIData
  ): Promise<IChatAI> {
    // Verify knowledge base ownership
    const kb = await KnowledgeBase.findById(knowledgeBaseId);
    if (!kb || kb.userId !== userId) {
      throw new Error('Knowledge base not found');
    }

    // Check for duplicate name within the same knowledge base
    const existingChatAI = await ChatAI.findByNameAndKnowledgeBase(data.name.trim(), knowledgeBaseId, userId);
    if (existingChatAI) {
      throw new Error('A Chat AI with this name already exists in this knowledge base');
    }

    const chatAI = await ChatAI.create({
      knowledgeBaseId,
      userId,
      name: data.name,
      llmName: data.llmName,
      modelName: data.modelName,
      settings: data.settings || {},
    });

    return chatAI;
  }

  /**
   * Update a chat AI
   */
  static async update(
    id: number,
    userId: number,
    data: UpdateChatAIData
  ): Promise<IChatAI | null> {
    const chatAI = await ChatAI.findById(id);
    if (!chatAI || chatAI.userId !== userId) {
      return null;
    }

    const updates: Partial<IChatAI> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.llmName !== undefined) updates.llmName = data.llmName;
    if (data.modelName !== undefined) updates.modelName = data.modelName;
    if (data.settings !== undefined) {
      updates.settings = { ...chatAI.settings, ...data.settings };
    }

    return await ChatAI.update(id, updates);
  }

  /**
   * Delete a chat AI
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    return await ChatAI.delete(id, userId);
  }

  /**
   * Toggle publish status of a chat AI
   */
  static async togglePublish(id: number, userId: number): Promise<IChatAI> {
    const chatAI = await ChatAI.findById(id);
    if (!chatAI || chatAI.userId !== userId) {
      throw new Error('Chat AI not found');
    }

    const updatedChatAI = await ChatAI.update(id, {
      isPublished: !chatAI.isPublished,
    });

    if (!updatedChatAI) {
      throw new Error('Failed to update chat AI');
    }

    return updatedChatAI;
  }

  /**
   * Execute a chat query using the chat AI settings
   */
  static async chat(
    id: number,
    userId: number,
    request: ChatRequest
  ): Promise<ChatResponse> {
    const chatAI = await ChatAI.findById(id);
    if (!chatAI || chatAI.userId !== userId) {
      throw new Error('Chat AI not found');
    }

    // Verify knowledge base exists
    const kb = await KnowledgeBase.findById(chatAI.knowledgeBaseId);
    if (!kb) {
      throw new Error('Knowledge base not found');
    }

    const settings = chatAI.settings;

    // Get connector and model
    const connector = await Connector.findByLlmName(chatAI.llmName);
    if (!connector || !connector.id) {
      throw new Error(`Connector not found for LLM: ${chatAI.llmName}`);
    }

    // Find the model
    const { ConnectorModel } = await import('../models/ConnectorModel');
    const models = await ConnectorModel.findByConnectorId(connector.id);
    const targetModel = models.find(m => m.model === chatAI.modelName);
    if (!targetModel) {
      throw new Error(`Model not found: ${chatAI.modelName}`);
    }

    // Transform history from { role, content } to { is_human, prompt } format required by Runpod/Python
    const formattedHistory = (request.history || [])
      .map((h: any) => {
        if ('is_human' in h && 'prompt' in h) {
          return {
            is_human: Boolean(h.is_human),
            prompt: String(h.prompt ?? ''),
          };
        }
        return {
          is_human: h.role === 'user',
          prompt: String(h.content ?? h.prompt ?? ''),
        };
      })
      .filter((h: any) => h.prompt && h.prompt.trim() !== '');

    // Base payload pieces reused for both Runpod and Lambda (but with different field sets)
    const chatArg = {
      temperature: settings.temperature ?? 0.2,
      top_k: settings.topK ?? 40,
      top_p: settings.topP ?? 0.95,
      max_tokens: settings.maxTokens ?? 2048, // align with Python default
      frequency_penalty: settings.frequencyPenalty ?? 0.0,
      presence_penalty: settings.presencePenalty ?? 0.0,
      stop: settings.stop || [],
    };

    const kbArg = {
      retrieval_limit: settings.retrievalLimit ?? 10, // align with Python default
      retrieval_score: settings.retrievalScore ?? 0.5, // align with Python default
    };

    // Use Runpod for Qwen, Lambda for other LLMs
    if (chatAI.llmName === 'qwen') {
      // Payload strictly matching Python Runpod handler expectations
      const runpodPayload = {
        kbId: chatAI.knowledgeBaseId,
        user_query: request.query,
        history: formattedHistory,
        external_knowledge_access: settings.externalKnowledge !== false,
        enable_reference: settings.enableReference || false,
        user_system_prompt:
          settings.instruction ??
          "You're Woice AI and you're here to help the people to provide the answer based on given knowledge. Give your answer in details and utilize more and more given information.",
        chat_arg: chatArg,
        kb_arg: kbArg,
        mongodb_srv_id: null,
        customdb_name: null,
        responseOnly: false,
      };

      console.log('ChatAI Runpod payload (before sending):', JSON.stringify(runpodPayload, null, 2));
      const runpodResponse = await RunpodService.queryKnowledgeBase(runpodPayload, true);

      // Parse Runpod response (different structure than Lambda)
      if (runpodResponse.output && runpodResponse.output['KNOWLEDGEBASE.CONTENT']) {
        const output = runpodResponse.output['KNOWLEDGEBASE.CONTENT'];
        const delayTime = runpodResponse.delayTime ? `${runpodResponse.delayTime / 1000} sec` : undefined;
        const executionTime = runpodResponse.executionTime ? `${runpodResponse.executionTime / 1000} sec` : undefined;

        // Process references to add document_url for S3 files
        const references = await this.processReferences(output.references || []);

        // Extract token information
        const inputTokens = output.input_tokens;
        const outputTokens = output.output_tokens;
        const totalTokens = output.total_tokens || (inputTokens && outputTokens ? inputTokens + outputTokens : undefined);

        // Process content to convert reference markdown links to use document_url
        const processedContent = await this.processContentWithReferences(
          output.llama_response || output.content || '',
          references
        );

        return {
          content: processedContent,
          references,
          executionTime,
          delayTime,
          inputTokens,
          outputTokens,
          totalTokens,
        };
      } else {
        throw new Error(runpodResponse.error || 'Runpod API returned an invalid response');
      }
    } else {
      // Lambda payload (can include Lambda-specific fields)
      const payload: any = {
        kbId: chatAI.knowledgeBaseId,
        user_query: request.query,
        history: formattedHistory,
        external_knowledge_access: settings.externalKnowledge !== false, // Default true
        enable_reference: settings.enableReference || false,
        user_system_prompt: settings.instruction || null,
        llm_name: chatAI.llmName,
        llm_config: {
          model: chatAI.modelName,
        },
        mongodb_srv_id: null,
        chat_arg: {
          ...chatArg,
          max_tokens: settings.maxTokens ?? 700, // Lambda default remains 700
        },
        kb_arg: {
          retrieval_limit: settings.retrievalLimit ?? 6,
          retrieval_score: settings.retrievalScore ?? 0.6,
        },
      };

      // Non-Qwen LLMs use Lambda - need API key
      const connectorUser = await ConnectorUser.findByUserAndConnector(userId, connector.id);
      if (!connectorUser || !connectorUser.id) {
        throw new Error(`No API key configured for ${chatAI.llmName}. Please configure the connector in Settings.`);
      }

      if (!connectorUser.isActive) {
        throw new Error(`API key for ${chatAI.llmName} is not active. Please activate it in Settings.`);
      }

      payload.api_key_id = connectorUser.id;

      console.log('ChatAI Lambda payload (before sending):', JSON.stringify(payload, null, 2));
      const lambdaResponse = await LambdaService.queryKnowledgeBase(payload);

      // Parse Lambda response
      console.log('Lambda response status:', lambdaResponse['KNOWLEDGEBASE.STATUS']);
      console.log('Lambda response body:', lambdaResponse.body);
      
      if (lambdaResponse['KNOWLEDGEBASE.STATUS'] === 'Success') {
        const output = lambdaResponse['KNOWLEDGEBASE.CONTENT'] || {};
        
        // Process references to add document_url for S3 files
        const references = await this.processReferences(output.references || []);

        // Extract token information
        const inputTokens = output.input_tokens;
        const outputTokens = output.output_tokens;
        const totalTokens = output.total_tokens || (inputTokens && outputTokens ? inputTokens + outputTokens : undefined);

        // Process content to convert reference markdown links to use document_url
        const processedContent = await this.processContentWithReferences(
          output.llama_response || output.content || '',
          references
        );

        return {
          content: processedContent,
          references,
          executionTime: output.executionTime ? `${output.executionTime / 1000} sec` : undefined,
          delayTime: output.delayTime ? `${output.delayTime / 1000} sec` : undefined,
          inputTokens,
          outputTokens,
          totalTokens,
        };
      } else {
        // Parse error from body if it's a JSON string
        let errorMessage = 'Chat query failed';
        if (lambdaResponse.body) {
          try {
            const errorBody = typeof lambdaResponse.body === 'string' 
              ? JSON.parse(lambdaResponse.body) 
              : lambdaResponse.body;
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          } catch (e) {
            errorMessage = lambdaResponse.body;
          }
        }
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Process references to add document_url for S3 files and contentId for text references
   */
  private static async processReferences(references: any[]): Promise<any[]> {
    if (!references || references.length === 0) {
      return [];
    }

    const processedReferences = await Promise.all(
      references.map(async (ref) => {
        const processedRef = { ...ref };
        const refType = (ref.type || '').toLowerCase();

        // For text references, s3_Key is actually a content ID (reference ID)
        if (refType === 'text' && (ref.s3_Key || ref.s3_key)) {
          const contentId = ref.s3_Key || ref.s3_key;
          // Store the content ID for text references (don't generate presigned URL)
          processedRef.contentId = parseInt(contentId) || null;
          processedRef.document_url = null; // Text references don't have document URLs
        } else if (ref.s3_Key || ref.s3_key) {
          // For non-text references, s3_Key is an actual S3 key
          const s3Key = ref.s3_Key || ref.s3_key;
          try {
            // Determine disposition based on file type
            const fileType = refType || '';
            const isPdf = s3Key.toLowerCase().endsWith('.pdf');
            const disposition = isPdf ? 'inline' : 'attachment';

            // Generate presigned URL (30 minutes expiry, matching Laravel)
            const documentUrl = await S3Service.getPresignedUrl(s3Key, 30 * 60, disposition);
            
            // Add page number to PDF URLs if pageNo exists
            if (isPdf && ref.pageNo) {
              processedRef.document_url = `${documentUrl}#page=${ref.pageNo}`;
            } else {
              processedRef.document_url = documentUrl;
            }
          } catch (error) {
            console.error(`Error generating presigned URL for ${s3Key}:`, error);
            processedRef.document_url = null;
          }
        } else if (ref.audio_url) {
          // For audio references, use audio_url if available
          try {
            const audioUrl = await S3Service.getPresignedUrl(ref.audio_url, 30 * 60, 'inline');
            processedRef.document_url = audioUrl;
          } catch (error) {
            console.error(`Error generating presigned URL for audio ${ref.audio_url}:`, error);
            processedRef.document_url = null;
          }
        } else if (ref.url && !ref.url.startsWith('http')) {
          // If url is an S3 key (doesn't start with http), generate presigned URL
          try {
            const url = await S3Service.getPresignedUrl(ref.url, 30 * 60, 'inline');
            processedRef.document_url = url;
          } catch (error) {
            console.error(`Error generating presigned URL for ${ref.url}:`, error);
            processedRef.document_url = null;
          }
        } else {
          // For other references or URLs, document_url is null
          processedRef.document_url = ref.document_url || null;
        }

        return processedRef;
      })
    );

    return processedReferences;
  }

  /**
   * Process content to convert reference markdown links [index](url) to use document_url from references
   * Example: [1](knowledge-bases/xxx.pdf) -> [1](presigned-url-to-pdf)
   */
  private static async processContentWithReferences(
    content: string,
    references: any[]
  ): Promise<string> {
    if (!content || !references || references.length === 0) {
      return content;
    }

    // Replace markdown reference links [index](url) with [index](document_url)
    // Pattern matches: [1](knowledge-bases/xxx.pdf) or [1](any-url)
    const markdownLinkPattern = /\[(\d+)\]\(([^)]+)\)/g;
    
    return content.replace(markdownLinkPattern, (match, indexStr, url) => {
      const index = parseInt(indexStr);
      const refIndex = index - 1; // Convert to 0-based index
      
      // Find reference by index (references array is 1-indexed in markdown)
      if (refIndex >= 0 && refIndex < references.length) {
        const ref = references[refIndex];
        
        // Use document_url if available, otherwise fallback to original URL
        const documentUrl = ref.document_url || ref.url || url;
        
        // Only replace if we have a document_url that's different from the original URL
        if (documentUrl && documentUrl !== url && documentUrl.startsWith('http')) {
          return `[${indexStr}](${documentUrl})`;
        }
      }
      
      // Keep original if no match found or no document_url available
      return match;
    });
  }
}

