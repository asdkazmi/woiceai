import pool from '../config/database';
import { ConnectorModel, IConnectorModel } from './ConnectorModel';

export interface IConnector {
  id?: number;
  llmName: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConnectorWithModels extends IConnector {
  models?: IConnectorModel[];
}

export class Connector {
  static async create(connectorData: IConnector): Promise<IConnector> {
    const { llmName, description } = connectorData;

    const [result]: any = await pool.execute(
      `INSERT INTO connectors (llm_name, description, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [llmName, description || null]
    );

    const connector = await Connector.findById(result.insertId);
    if (!connector) {
      throw new Error('Failed to create connector');
    }
    return connector;
  }

  static async findById(id: number, includeModels: boolean = false): Promise<IConnectorWithModels | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, llm_name as llmName, description, created_at as createdAt, updated_at as updatedAt
       FROM connectors WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const connector = this.mapRowToConnector(rows[0]);

    if (includeModels) {
      const models = await ConnectorModel.findByConnectorId(id);
      return { ...connector, models };
    }

    return connector;
  }

  static async findByLlmName(llmName: string, includeModels: boolean = false): Promise<IConnectorWithModels | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, llm_name as llmName, description, created_at as createdAt, updated_at as updatedAt
       FROM connectors WHERE llm_name = ?`,
      [llmName]
    );

    if (rows.length === 0) return null;

    const connector = this.mapRowToConnector(rows[0]);

    if (includeModels) {
      const models = await ConnectorModel.findByConnectorId(connector.id!);
      return { ...connector, models };
    }

    return connector;
  }

  static async findAll(includeModels: boolean = false): Promise<IConnectorWithModels[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, llm_name as llmName, description, created_at as createdAt, updated_at as updatedAt
       FROM connectors ORDER BY created_at DESC`
    );

    const connectors = rows.map((row: any) => this.mapRowToConnector(row));

    if (includeModels) {
      const connectorsWithModels = await Promise.all(
        connectors.map(async (connector: IConnector) => {
          const models = await ConnectorModel.findByConnectorId(connector.id!);
          return { ...connector, models };
        })
      );
      return connectorsWithModels;
    }

    return connectors;
  }

  static async update(id: number, updates: Partial<IConnector>): Promise<IConnector | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.llmName !== undefined) {
      fields.push('llm_name = ?');
      values.push(updates.llmName);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE connectors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM connectors WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  private static mapRowToConnector(row: any): IConnector {
    return {
      id: row.id,
      llmName: row.llmName,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default Connector;

