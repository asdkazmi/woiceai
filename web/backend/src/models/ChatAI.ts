import pool from '../config/database';

export interface IChatAISettings {
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
}

export interface IChatAI {
  id?: number;
  knowledgeBaseId: number;
  userId: number;
  name: string;
  llmName: string;
  modelName: string;
  settings: IChatAISettings;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ChatAI {
  static async create(chatAIData: IChatAI): Promise<IChatAI> {
    const { knowledgeBaseId, userId, name, llmName, modelName, settings, isPublished } = chatAIData;

    const [result]: any = await pool.execute(
      `INSERT INTO chat_ais (knowledge_base_id, user_id, name, llm_name, model_name, settings, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        knowledgeBaseId,
        userId,
        name,
        llmName || 'qwen',
        modelName || 'Qwen-14b-Instruct',
        JSON.stringify(settings || {}),
        isPublished || false,
      ]
    );

    const chatAI = await ChatAI.findById(result.insertId);
    if (!chatAI) {
      throw new Error('Failed to create chat AI');
    }
    return chatAI;
  }

  static async findById(id: number): Promise<IChatAI | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, user_id as userId, name, 
              llm_name as llmName, model_name as modelName, settings, is_published as isPublished,
              created_at as createdAt, updated_at as updatedAt
       FROM chat_ais WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToChatAI(rows[0]);
  }

  static async findByKnowledgeBaseId(knowledgeBaseId: number, userId?: number): Promise<IChatAI[]> {
    let query = `SELECT id, knowledge_base_id as knowledgeBaseId, user_id as userId, name, 
                        llm_name as llmName, model_name as modelName, settings, is_published as isPublished,
                        created_at as createdAt, updated_at as updatedAt
                 FROM chat_ais WHERE knowledge_base_id = ?`;
    const params: any[] = [knowledgeBaseId];

    if (userId !== undefined) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows]: any = await pool.execute(query, params);
    return rows.map((row: any) => this.mapRowToChatAI(row));
  }

  static async findByUserId(userId: number): Promise<IChatAI[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, user_id as userId, name, 
              llm_name as llmName, model_name as modelName, settings, is_published as isPublished,
              created_at as createdAt, updated_at as updatedAt
       FROM chat_ais WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((row: any) => this.mapRowToChatAI(row));
  }

  static async findByNameAndKnowledgeBase(name: string, knowledgeBaseId: number, userId?: number): Promise<IChatAI | null> {
    let query = `SELECT id, knowledge_base_id as knowledgeBaseId, user_id as userId, name, 
                        llm_name as llmName, model_name as modelName, settings, is_published as isPublished,
                        created_at as createdAt, updated_at as updatedAt
                 FROM chat_ais WHERE name = ? AND knowledge_base_id = ?`;
    const params: any[] = [name, knowledgeBaseId];

    if (userId !== undefined) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const [rows]: any = await pool.execute(query, params);

    if (rows.length === 0) return null;
    return this.mapRowToChatAI(rows[0]);
  }

  static async update(id: number, updates: Partial<IChatAI>): Promise<IChatAI | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.llmName !== undefined) {
      fields.push('llm_name = ?');
      values.push(updates.llmName);
    }
    if (updates.modelName !== undefined) {
      fields.push('model_name = ?');
      values.push(updates.modelName);
    }
    if (updates.settings !== undefined) {
      fields.push('settings = ?');
      values.push(JSON.stringify(updates.settings));
    }
    if (updates.isPublished !== undefined) {
      fields.push('is_published = ?');
      values.push(updates.isPublished);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE chat_ais SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM chat_ais WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async findPublishedByUserId(userId: number): Promise<(IChatAI & { knowledgeBaseName?: string })[]> {
    const [rows]: any = await pool.execute(
      `SELECT 
        ca.id, 
        ca.knowledge_base_id as knowledgeBaseId, 
        ca.user_id as userId, 
        ca.name, 
        ca.llm_name as llmName, 
        ca.model_name as modelName, 
        ca.settings, 
        ca.is_published as isPublished,
        ca.created_at as createdAt, 
        ca.updated_at as updatedAt,
        kb.name as knowledgeBaseName
       FROM chat_ais ca
       INNER JOIN knowledge_bases kb ON ca.knowledge_base_id = kb.id
       WHERE ca.user_id = ? AND ca.is_published = 1
       ORDER BY ca.created_at DESC`,
      [userId]
    );

    return rows.map((row: any) => ({
      ...this.mapRowToChatAI(row),
      knowledgeBaseName: row.knowledgeBaseName,
    }));
  }

  private static mapRowToChatAI(row: any): IChatAI {
    let settings: IChatAISettings = {};
    try {
      settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {};
    } catch (e) {
      settings = {};
    }

    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      userId: row.userId,
      name: row.name,
      llmName: row.llmName || 'qwen',
      modelName: row.modelName || 'Qwen-14b-Instruct',
      settings,
      isPublished: row.isPublished === 1 || row.isPublished === true || false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default ChatAI;

