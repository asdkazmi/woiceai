import pool from '../config/database';

export interface IAgentExecutionState {
  currentNodeId?: string;
  context?: Record<string, any>;
  isRestart?: boolean;
  userInputs?: Array<{ nodeId: string; value: any }>;
}

export interface IAgentExecution {
  id?: number;
  agentId: number;
  userId: number;
  executionState?: IAgentExecutionState | null;
  status?: 'running' | 'waiting_input' | 'completed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

export class AgentExecution {
  static async create(executionData: IAgentExecution): Promise<IAgentExecution> {
    const { agentId, userId, executionState, status } = executionData;

    const [result]: any = await pool.execute(
      `INSERT INTO agent_executions (agent_id, user_id, execution_state, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        agentId,
        userId,
        executionState ? JSON.stringify(executionState) : null,
        status || 'running',
      ]
    );

    const execution = await AgentExecution.findById(result.insertId);
    if (!execution) {
      throw new Error('Failed to create agent execution');
    }
    return execution;
  }

  static async findById(id: number): Promise<IAgentExecution | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, agent_id as agentId, user_id as userId, execution_state as executionState,
              status, created_at as createdAt, updated_at as updatedAt
       FROM agent_executions WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToExecution(rows[0]);
  }

  static async findByAgentAndUser(agentId: number, userId: number): Promise<IAgentExecution | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, agent_id as agentId, user_id as userId, execution_state as executionState,
              status, created_at as createdAt, updated_at as updatedAt
       FROM agent_executions 
       WHERE agent_id = ? AND user_id = ? AND status IN ('running', 'waiting_input')
       ORDER BY created_at DESC LIMIT 1`,
      [agentId, userId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToExecution(rows[0]);
  }

  static async update(id: number, updates: Partial<IAgentExecution>): Promise<boolean> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.executionState !== undefined) {
      updateFields.push('execution_state = ?');
      params.push(updates.executionState ? JSON.stringify(updates.executionState) : null);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = NOW()');
    params.push(id);

    const [result]: any = await pool.execute(
      `UPDATE agent_executions SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return result.affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM agent_executions WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async deleteByAgentAndUser(agentId: number, userId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM agent_executions WHERE agent_id = ? AND user_id = ?',
      [agentId, userId]
    );

    return result.affectedRows > 0;
  }

  private static mapRowToExecution(row: any): IAgentExecution {
    return {
      id: row.id,
      agentId: row.agentId,
      userId: row.userId,
      executionState: row.executionState 
        ? (typeof row.executionState === 'string' ? JSON.parse(row.executionState) : row.executionState)
        : null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

