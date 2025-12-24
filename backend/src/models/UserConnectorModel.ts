import pool from '../config/database';

export interface IUserConnectorModel {
  id?: number;
  userId: number;
  connectorId: number;
  modelId: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserConnectorModel {
  static async create(userModelData: IUserConnectorModel): Promise<IUserConnectorModel> {
    const { userId, connectorId, modelId, isActive } = userModelData;

    const [result]: any = await pool.execute(
      `INSERT INTO user_connector_models (user_id, connector_id, model_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [userId, connectorId, modelId, isActive]
    );

    const userModel = await UserConnectorModel.findById(result.insertId);
    if (!userModel) {
      throw new Error('Failed to create user connector model');
    }
    return userModel;
  }

  static async findById(id: number): Promise<IUserConnectorModel | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, model_id as modelId, 
              is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM user_connector_models WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToUserModel(rows[0]);
  }

  static async findActiveByUserId(userId: number): Promise<IUserConnectorModel | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, model_id as modelId, 
              is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM user_connector_models WHERE user_id = ? AND is_active = TRUE LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToUserModel(rows[0]);
  }

  static async findByUserId(userId: number): Promise<IUserConnectorModel[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, model_id as modelId, 
              is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM user_connector_models WHERE user_id = ?`,
      [userId]
    );

    return rows.map((row: any) => this.mapRowToUserModel(row));
  }

  static async findByUserAndModel(userId: number, modelId: number): Promise<IUserConnectorModel | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, connector_id as connectorId, model_id as modelId, 
              is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM user_connector_models WHERE user_id = ? AND model_id = ?`,
      [userId, modelId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToUserModel(rows[0]);
  }

  static async updateOrCreate(
    userId: number,
    connectorId: number,
    modelId: number,
    updates: Partial<IUserConnectorModel>
  ): Promise<IUserConnectorModel> {
    const existing = await this.findByUserAndModel(userId, modelId);

    if (existing) {
      return await this.update(existing.id!, updates) as IUserConnectorModel;
    } else {
      return await this.create({
        userId,
        connectorId,
        modelId,
        isActive: updates.isActive ?? false,
      });
    }
  }

  static async update(id: number, updates: Partial<IUserConnectorModel>): Promise<IUserConnectorModel | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE user_connector_models SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async deactivateAllForUser(userId: number): Promise<void> {
    await pool.execute(
      `UPDATE user_connector_models SET is_active = FALSE, updated_at = NOW() WHERE user_id = ?`,
      [userId]
    );
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM user_connector_models WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async deleteByUserAndConnector(userId: number, connectorId: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM user_connector_models WHERE user_id = ? AND connector_id = ?',
      [userId, connectorId]
    );
    return result.affectedRows > 0;
  }

  private static mapRowToUserModel(row: any): IUserConnectorModel {
    return {
      id: row.id,
      userId: row.userId,
      connectorId: row.connectorId,
      modelId: row.modelId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default UserConnectorModel;

