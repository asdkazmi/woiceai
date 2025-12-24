import pool from '../config/database';

export interface IConnectorUser {
  id?: number;
  userId: number;
  connectorId: number;
  apiKey?: string | null;
  isActive: boolean;
  dialogueMode?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConnectorUser {
  static async create(userData: IConnectorUser): Promise<IConnectorUser> {
    const { userId, connectorId, apiKey, isActive, dialogueMode } = userData;

    const [result]: any = await pool.execute(
      `INSERT INTO connector_user (user_id, connector_id, api_key, is_active, dialogue_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, connectorId, apiKey || null, isActive, dialogueMode || null]
    );

    const connectorUser = await ConnectorUser.findById(result.insertId);
    if (!connectorUser) {
      throw new Error('Failed to create connector user');
    }
    return connectorUser;
  }

  static async findById(id: number): Promise<IConnectorUser | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, api_key as apiKey, 
              is_active as isActive, dialogue_mode as dialogueMode, 
              created_at as createdAt, updated_at as updatedAt
       FROM connector_user WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToConnectorUser(rows[0]);
  }

  static async findByUserAndConnector(userId: number, connectorId: number): Promise<IConnectorUser | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, api_key as apiKey, 
              is_active as isActive, dialogue_mode as dialogueMode, 
              created_at as createdAt, updated_at as updatedAt
       FROM connector_user WHERE user_id = ? AND connector_id = ?`,
      [userId, connectorId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToConnectorUser(rows[0]);
  }

  static async findByUserId(userId: number): Promise<IConnectorUser[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, api_key as apiKey, 
              is_active as isActive, dialogue_mode as dialogueMode, 
              created_at as createdAt, updated_at as updatedAt
       FROM connector_user WHERE user_id = ?`,
      [userId]
    );

    return rows.map((row: any) => this.mapRowToConnectorUser(row));
  }

  static async findActiveByUserId(userId: number): Promise<IConnectorUser[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, api_key as apiKey, 
              is_active as isActive, dialogue_mode as dialogueMode, 
              created_at as createdAt, updated_at as updatedAt
       FROM connector_user WHERE user_id = ? AND is_active = TRUE`,
      [userId]
    );

    return rows.map((row: any) => this.mapRowToConnectorUser(row));
  }

  static async updateOrCreate(
    userId: number,
    connectorId: number,
    updates: Partial<IConnectorUser>
  ): Promise<IConnectorUser> {
    const existing = await this.findByUserAndConnector(userId, connectorId);

    if (existing) {
      return await this.update(existing.id!, updates) as IConnectorUser;
    } else {
      return await this.create({
        userId,
        connectorId,
        apiKey: updates.apiKey ?? null,
        isActive: updates.isActive ?? false,
        dialogueMode: updates.dialogueMode ?? null,
      });
    }
  }

  static async update(id: number, updates: Partial<IConnectorUser>): Promise<IConnectorUser | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?');
      values.push(updates.apiKey);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }
    if (updates.dialogueMode !== undefined) {
      fields.push('dialogue_mode = ?');
      values.push(updates.dialogueMode);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE connector_user SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM connector_user WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async deleteByUserAndConnector(userId: number, connectorId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM connector_user WHERE user_id = ? AND connector_id = ?',
      [userId, connectorId]
    );
    return result.affectedRows > 0;
  }

  private static mapRowToConnectorUser(row: any): IConnectorUser {
    return {
      id: row.id,
      userId: row.userId,
      connectorId: row.connectorId,
      apiKey: row.apiKey,
      isActive: row.isActive,
      dialogueMode: row.dialogueMode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default ConnectorUser;

