import pool from '../config/database';

export interface IConnectorModel {
  id?: number;
  connectorId: number;
  model: string;
  settings?: any | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConnectorModel {
  static async create(modelData: IConnectorModel): Promise<IConnectorModel> {
    const { connectorId, model, settings } = modelData;

    const [result]: any = await pool.execute(
      `INSERT INTO connector_models (connector_id, model, settings, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [connectorId, model, settings ? JSON.stringify(settings) : null]
    );

    const createdModel = await ConnectorModel.findById(result.insertId);
    if (!createdModel) {
      throw new Error('Failed to create connector model');
    }
    return createdModel;
  }

  static async createMany(models: IConnectorModel[]): Promise<IConnectorModel[]> {
    if (models.length === 0) return [];

    const created: IConnectorModel[] = [];
    for (const model of models) {
      const createdModel = await this.create(model);
      created.push(createdModel);
    }
    return created;
  }

  static async findById(id: number): Promise<IConnectorModel | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, connector_id as connectorId, model, settings, created_at as createdAt, updated_at as updatedAt
       FROM connector_models WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  static async findByConnectorId(connectorId: number): Promise<IConnectorModel[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, connector_id as connectorId, model, settings, created_at as createdAt, updated_at as updatedAt
       FROM connector_models WHERE connector_id = ? ORDER BY created_at ASC`,
      [connectorId]
    );

    return rows.map((row: any) => this.mapRowToModel(row));
  }

  static async findByModel(modelName: string): Promise<IConnectorModel | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, connector_id as connectorId, model, settings, created_at as createdAt, updated_at as updatedAt
       FROM connector_models WHERE model = ? LIMIT 1`,
      [modelName]
    );

    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  static async update(id: number, updates: Partial<IConnectorModel>): Promise<IConnectorModel | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.model !== undefined) {
      fields.push('model = ?');
      values.push(updates.model);
    }
    if (updates.settings !== undefined) {
      fields.push('settings = ?');
      values.push(updates.settings ? JSON.stringify(updates.settings) : null);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE connector_models SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM connector_models WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  private static mapRowToModel(row: any): IConnectorModel {
    return {
      id: row.id,
      connectorId: row.connectorId,
      model: row.model,
      settings: row.settings ? (typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default ConnectorModel;

