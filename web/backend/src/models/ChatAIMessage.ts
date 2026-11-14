import pool from '../config/database';

export interface IChatAIMessage {
  id?: number;
  chatAIId: number;
  role: 'user' | 'assistant';
  content: string;
  references?: any[] | null;
  executionTime?: string | null;
  delayTime?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  createdAt?: Date;
}

export class ChatAIMessage {
  static async create(messageData: IChatAIMessage): Promise<IChatAIMessage> {
    const { chatAIId, role, content, references, executionTime, delayTime, inputTokens, outputTokens, totalTokens } = messageData;

    const [result]: any = await pool.execute(
      `INSERT INTO chat_ai_messages (chat_ai_id, role, content, references_json, execution_time, delay_time, input_tokens, output_tokens, total_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        chatAIId,
        role,
        content,
        references ? JSON.stringify(references) : null,
        executionTime || null,
        delayTime || null,
        inputTokens || null,
        outputTokens || null,
        totalTokens || null,
      ]
    );

    const message = await ChatAIMessage.findById(result.insertId);
    if (!message) {
      throw new Error('Failed to create chat AI message');
    }
    return message;
  }

  static async findById(id: number): Promise<IChatAIMessage | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, chat_ai_id as chatAIId, role, content, references_json as referencesJson,
              execution_time as executionTime, delay_time as delayTime, 
              input_tokens as inputTokens, output_tokens as outputTokens, total_tokens as totalTokens,
              created_at as createdAt
       FROM chat_ai_messages WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToMessage(rows[0]);
  }

  static async findByChatAIId(chatAIId: number): Promise<IChatAIMessage[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, chat_ai_id as chatAIId, role, content, references_json as referencesJson,
              execution_time as executionTime, delay_time as delayTime,
              input_tokens as inputTokens, output_tokens as outputTokens, total_tokens as totalTokens,
              created_at as createdAt
       FROM chat_ai_messages WHERE chat_ai_id = ? ORDER BY created_at ASC`,
      [chatAIId]
    );

    return rows.map((row: any) => this.mapRowToMessage(row));
  }

  static async deleteByChatAIId(chatAIId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM chat_ai_messages WHERE chat_ai_id = ?',
      [chatAIId]
    );
    return result.affectedRows >= 0;
  }

  static async deleteMany(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;

    const placeholders = ids.map(() => '?').join(',');
    const [result]: any = await pool.execute(
      `DELETE FROM chat_ai_messages WHERE id IN (${placeholders})`,
      ids
    );
    return result.affectedRows > 0;
  }

  private static mapRowToMessage(row: any): IChatAIMessage {
    let references: any[] | null = null;
    try {
      references = row.referencesJson 
        ? (typeof row.referencesJson === 'string' ? JSON.parse(row.referencesJson) : row.referencesJson)
        : null;
    } catch (e) {
      references = null;
    }

    return {
      id: row.id,
      chatAIId: row.chatAIId,
      role: row.role,
      content: row.content,
      references,
      executionTime: row.executionTime || null,
      delayTime: row.delayTime || null,
      inputTokens: row.inputTokens || null,
      outputTokens: row.outputTokens || null,
      totalTokens: row.totalTokens || null,
      createdAt: row.createdAt,
    };
  }
}

export default ChatAIMessage;

