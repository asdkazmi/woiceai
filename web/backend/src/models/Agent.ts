import pool from '../config/database';

export interface IAgentData {
  nodes: any[];
  edges: any[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface IAgent {
  id?: number;
  userId: number;
  name: string;
  description?: string | null;
  agentData: IAgentData;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Agent {
  static async create(agentData: IAgent): Promise<IAgent> {
    const { userId, name, description, agentData: data, isPublished } = agentData;

    const [result]: any = await pool.execute(
      `INSERT INTO agents (user_id, name, description, agent_data, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        name,
        description || null,
        JSON.stringify(data),
        isPublished || false,
      ]
    );

    const agent = await Agent.findById(result.insertId);
    if (!agent) {
      throw new Error('Failed to create agent');
    }
    return agent;
  }

  static async findById(id: number): Promise<IAgent | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, name, description, agent_data as agentData, 
              is_published as isPublished, created_at as createdAt, updated_at as updatedAt
       FROM agents WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToAgent(rows[0]);
  }

  static async findByUserId(userId: number): Promise<IAgent[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, name, description, agent_data as agentData, 
              is_published as isPublished, created_at as createdAt, updated_at as updatedAt
       FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((row: any) => this.mapRowToAgent(row));
  }

  static async findByNameAndUser(name: string, userId: number): Promise<IAgent | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, name, description, agent_data as agentData, 
              is_published as isPublished, created_at as createdAt, updated_at as updatedAt
       FROM agents WHERE name = ? AND user_id = ?`,
      [name, userId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToAgent(rows[0]);
  }

  static async update(id: number, updates: Partial<IAgent>): Promise<boolean> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.agentData !== undefined) {
      updateFields.push('agent_data = ?');
      params.push(JSON.stringify(updates.agentData));
    }
    if (updates.isPublished !== undefined) {
      updateFields.push('is_published = ?');
      params.push(updates.isPublished);
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = NOW()');
    params.push(id);

    const [result]: any = await pool.execute(
      `UPDATE agents SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return result.affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM agents WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async findPublishedAgents(): Promise<IAgent[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, name, description, agent_data as agentData, 
              is_published as isPublished, created_at as createdAt, updated_at as updatedAt
       FROM agents WHERE is_published = TRUE ORDER BY created_at DESC`
    );

    return rows.map((row: any) => this.mapRowToAgent(row));
  }

  private static mapRowToAgent(row: any): IAgent {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      agentData: typeof row.agentData === 'string' ? JSON.parse(row.agentData) : row.agentData,
      isPublished: row.isPublished === 1 || row.isPublished === true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

