import pool from '../config/database';

export interface IAgentChatMessage {
  id?: number;
  agentId: number;
  userId: number;
  executionId?: number | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  references?: any[] | null;
  executionTime?: string | null;
  delayTime?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  createdAt?: Date;
}

export class AgentChatMessage {
  static async create(messageData: IAgentChatMessage): Promise<IAgentChatMessage> {
    const { agentId, userId, executionId, role, content, references, executionTime, delayTime, inputTokens, outputTokens, totalTokens } = messageData;

    const [result]: any = await pool.execute(
      `INSERT INTO agent_chat_messages (agent_id, user_id, execution_id, role, content, references_json, execution_time, delay_time, input_tokens, output_tokens, total_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        agentId,
        userId,
        executionId || null,
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

    const message = await AgentChatMessage.findById(result.insertId);
    if (!message) {
      throw new Error('Failed to create agent chat message');
    }
    return message;
  }

  static async findById(id: number): Promise<IAgentChatMessage | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, agent_id as agentId, user_id as userId, execution_id as executionId,
              role, content, references_json as referencesJson, execution_time as executionTime,
              delay_time as delayTime, input_tokens as inputTokens, output_tokens as outputTokens,
              total_tokens as totalTokens, created_at as createdAt
       FROM agent_chat_messages WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToMessage(rows[0]);
  }

  static async findByAgentAndUser(agentId: number, userId: number, limit?: number): Promise<IAgentChatMessage[]> {
    let query = `SELECT id, agent_id as agentId, user_id as userId, execution_id as executionId,
                        role, content, references_json as referencesJson, execution_time as executionTime,
                        delay_time as delayTime, input_tokens as inputTokens, output_tokens as outputTokens,
                        total_tokens as totalTokens, created_at as createdAt
                 FROM agent_chat_messages 
                 WHERE agent_id = ? AND user_id = ?
                 ORDER BY created_at ASC`;
    
    const params: any[] = [agentId, userId];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const [rows]: any = await pool.execute(query, params);

    return rows.map((row: any) => this.mapRowToMessage(row));
  }

  static async deleteByAgentAndUser(agentId: number, userId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM agent_chat_messages WHERE agent_id = ? AND user_id = ?',
      [agentId, userId]
    );

    return result.affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM agent_chat_messages WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  private static mapRowToMessage(row: any): IAgentChatMessage {
    return {
      id: row.id,
      agentId: row.agentId,
      userId: row.userId,
      executionId: row.executionId,
      role: row.role,
      content: row.content,
      references: row.referencesJson ? (typeof row.referencesJson === 'string' ? JSON.parse(row.referencesJson) : row.referencesJson) : null,
      executionTime: row.executionTime,
      delayTime: row.delayTime,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalTokens: row.totalTokens,
      createdAt: row.createdAt,
    };
  }
}

