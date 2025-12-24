import pool from '../config/database';

export interface IKnowledgeBase {
  id?: number;
  userId: number;
  name: string;
  knowledgeBaseApiId?: string | null;
  status?: 'pending' | 'queued' | 'processing' | 'indexed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IKnowledgeBaseWithContents extends IKnowledgeBase {
  knowledgeBaseContents?: IKnowledgeBaseContent[];
}

export interface IKnowledgeBaseContentStats {
  total: number;
  completed: number;
  pending: number;
  queued: number;
  processing: number;
  failed: number;
}

export interface IKnowledgeBaseContent {
  id?: number;
  knowledgeBaseId: number;
  content: string;
  textContent?: string | null;
  type: 'file' | 'url' | 'text' | 'audio' | 'video' | 'image';
  status?: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  depth?: number | null;
  filename?: string | null;
  transcription?: string | null;
  explanation?: string | null;
  sceneExplanation?: string | null;
  childPages?: any[] | null;
  treeDocumentId?: string | null;
  documentUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class KnowledgeBase {
  static readonly STATUS_PENDING = 'pending';
  static readonly STATUS_QUEUED = 'queued';
  static readonly STATUS_PROCESSING = 'processing';
  static readonly STATUS_COMPLETED = 'indexed';
  static readonly STATUS_FAILED = 'failed';

  static async create(kbData: IKnowledgeBase): Promise<IKnowledgeBase> {
    const { userId, name, knowledgeBaseApiId, status } = kbData;

    const [result]: any = await pool.execute(
      `INSERT INTO knowledge_bases (user_id, name, knowledge_base_api_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [userId, name, knowledgeBaseApiId || null, status || this.STATUS_PENDING]
    );

    const kb = await KnowledgeBase.findById(result.insertId);
    if (!kb) {
      throw new Error('Failed to create knowledge base');
    }
    return kb;
  }

  static async findById(id: number, includeContents: boolean = false): Promise<IKnowledgeBaseWithContents | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, user_id as userId, name, knowledge_base_api_id as knowledgeBaseApiId, 
              status, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_bases WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const kb = this.mapRowToKnowledgeBase(rows[0]);

    if (includeContents) {
      const contents = await KnowledgeBaseContent.findByKnowledgeBaseId(id);
      return { ...kb, knowledgeBaseContents: contents };
    }

    return kb;
  }

  static async findByUserId(userId: number): Promise<(IKnowledgeBase & { contentStats?: IKnowledgeBaseContentStats })[]> {
    const [rows]: any = await pool.execute(
      `SELECT 
        kb.id, 
        kb.user_id as userId, 
        kb.name, 
        kb.knowledge_base_api_id as knowledgeBaseApiId, 
        kb.status, 
        kb.created_at as createdAt, 
        kb.updated_at as updatedAt,
        COUNT(kbc.id) as total,
        SUM(CASE WHEN kbc.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN kbc.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN kbc.status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN kbc.status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN kbc.status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM knowledge_bases kb
       LEFT JOIN knowledge_base_contents kbc ON kb.id = kbc.knowledge_base_id
       WHERE kb.user_id = ? 
       GROUP BY kb.id, kb.user_id, kb.name, kb.knowledge_base_api_id, kb.status, kb.created_at, kb.updated_at
       ORDER BY kb.created_at DESC`,
      [userId]
    );

    return rows.map((row: any) => ({
      ...this.mapRowToKnowledgeBase(row),
      contentStats: {
        total: parseInt(row.total) || 0,
        completed: parseInt(row.completed) || 0,
        pending: parseInt(row.pending) || 0,
        queued: parseInt(row.queued) || 0,
        processing: parseInt(row.processing) || 0,
        failed: parseInt(row.failed) || 0,
      },
    }));
  }

  static async update(id: number, updates: Partial<IKnowledgeBase>): Promise<IKnowledgeBase | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.knowledgeBaseApiId !== undefined) {
      fields.push('knowledge_base_api_id = ?');
      values.push(updates.knowledgeBaseApiId);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE knowledge_bases SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const [result]: any = await pool.execute(
      'DELETE FROM knowledge_bases WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  private static mapRowToKnowledgeBase(row: any): IKnowledgeBase {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      knowledgeBaseApiId: row.knowledgeBaseApiId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export class KnowledgeBaseContent {
  static readonly TYPE_FILE = 'file';
  static readonly TYPE_URL = 'url';
  static readonly TYPE_TEXT = 'text';
  static readonly TYPE_AUDIO = 'audio';
  static readonly TYPE_VIDEO = 'video';
  static readonly TYPE_IMAGE = 'image';

  static readonly STATUS_PENDING = 'pending';
  static readonly STATUS_QUEUED = 'queued';
  static readonly STATUS_PROCESSING = 'processing';
  static readonly STATUS_COMPLETED = 'completed';
  static readonly STATUS_FAILED = 'failed';

  static readonly DEFAULT_DEPTH = 1;

  static async create(contentData: IKnowledgeBaseContent): Promise<IKnowledgeBaseContent> {
    const {
      knowledgeBaseId,
      content,
      textContent,
      type,
      status,
      depth,
      filename,
      transcription,
      childPages,
      treeDocumentId,
    } = contentData;

    const [result]: any = await pool.execute(
      `INSERT INTO knowledge_base_contents 
       (knowledge_base_id, content, text_content, type, status, depth, filename, transcription, child_pages, tree_document_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        knowledgeBaseId,
        content,
        textContent || null,
        type,
        status || this.STATUS_PENDING,
        depth || null,
        filename || null,
        transcription || null,
        childPages ? JSON.stringify(childPages) : null,
        treeDocumentId || null,
      ]
    );

    const contentItem = await KnowledgeBaseContent.findById(result.insertId);
    if (!contentItem) {
      throw new Error('Failed to create knowledge base content');
    }
    return contentItem;
  }

  static async createMany(contents: IKnowledgeBaseContent[]): Promise<IKnowledgeBaseContent[]> {
    if (contents.length === 0) return [];

    const created: IKnowledgeBaseContent[] = [];
    for (const content of contents) {
      const createdItem = await this.create(content);
      created.push(createdItem);
    }
    return created;
  }

  static async findById(id: number): Promise<IKnowledgeBaseContent | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, content, text_content as textContent,
              type, status, depth, filename, transcription, explanation, scene_explanation as sceneExplanation,
              child_pages as childPages, tree_document_id as treeDocumentId, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_base_contents WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToContent(rows[0]);
  }

  static async findByKnowledgeBaseId(knowledgeBaseId: number): Promise<IKnowledgeBaseContent[]> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, content, text_content as textContent,
              type, status, depth, filename, transcription, explanation, scene_explanation as sceneExplanation,
              child_pages as childPages, tree_document_id as treeDocumentId, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_base_contents WHERE knowledge_base_id = ? ORDER BY created_at DESC`,
      [knowledgeBaseId]
    );

    return rows.map((row: any) => this.mapRowToContent(row));
  }

  static async findByIds(ids: number[]): Promise<IKnowledgeBaseContent[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, content, text_content as textContent,
              type, status, depth, filename, transcription, explanation, scene_explanation as sceneExplanation,
              child_pages as childPages, tree_document_id as treeDocumentId, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_base_contents WHERE id IN (${placeholders})`,
      ids
    );

    return rows.map((row: any) => this.mapRowToContent(row));
  }

  static async deleteMany(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;

    const placeholders = ids.map(() => '?').join(',');
    const [result]: any = await pool.execute(
      `DELETE FROM knowledge_base_contents WHERE id IN (${placeholders})`,
      ids
    );
    return result.affectedRows > 0;
  }

  static async countInProgress(knowledgeBaseId: number): Promise<number> {
    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) as count FROM knowledge_base_contents 
       WHERE knowledge_base_id = ? AND status IN (?, ?, ?)`,
      [knowledgeBaseId, this.STATUS_PENDING, this.STATUS_QUEUED, this.STATUS_PROCESSING]
    );
    return rows[0].count;
  }

  static async findByKnowledgeBaseIdAndContent(
    knowledgeBaseId: number,
    content: string
  ): Promise<IKnowledgeBaseContent | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, content, text_content as textContent,
              type, status, depth, filename, transcription, explanation, scene_explanation as sceneExplanation,
              child_pages as childPages, tree_document_id as treeDocumentId, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_base_contents 
       WHERE knowledge_base_id = ? AND content = ? LIMIT 1`,
      [knowledgeBaseId, content]
    );

    if (rows.length === 0) return null;
    return this.mapRowToContent(rows[0]);
  }

  /**
   * Find knowledge base content by unique ID
   * UNIQUE_ID is the primary key (id) from the knowledge_base_contents table
   */
  static async findByUniqueId(
    knowledgeBaseId: number,
    uniqueId: string
  ): Promise<IKnowledgeBaseContent | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, knowledge_base_id as knowledgeBaseId, content, text_content as textContent,
              type, status, depth, filename, transcription, explanation, scene_explanation as sceneExplanation,
              child_pages as childPages, tree_document_id as treeDocumentId, created_at as createdAt, updated_at as updatedAt
       FROM knowledge_base_contents 
       WHERE knowledge_base_id = ? AND id = ? LIMIT 1`,
      [knowledgeBaseId, parseInt(uniqueId)]
    );

    if (rows.length === 0) return null;
    return this.mapRowToContent(rows[0]);
  }

  static async hasIncompleteContent(knowledgeBaseId: number): Promise<boolean> {
    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) as count FROM knowledge_base_contents 
       WHERE knowledge_base_id = ? AND status NOT IN (?, ?)`,
      [knowledgeBaseId, this.STATUS_COMPLETED, this.STATUS_FAILED]
    );
    return rows[0].count > 0;
  }

  static async update(id: number, updates: Partial<IKnowledgeBaseContent>): Promise<IKnowledgeBaseContent | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.textContent !== undefined) {
      fields.push('text_content = ?');
      values.push(updates.textContent);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.transcription !== undefined) {
      fields.push('transcription = ?');
      values.push(updates.transcription);
    }
    if (updates.explanation !== undefined) {
      fields.push('explanation = ?');
      values.push(updates.explanation);
    }
    if (updates.sceneExplanation !== undefined) {
      fields.push('scene_explanation = ?');
      values.push(updates.sceneExplanation);
    }
    if (updates.childPages !== undefined) {
      fields.push('child_pages = ?');
      values.push(updates.childPages ? JSON.stringify(updates.childPages) : null);
    }
    if (updates.treeDocumentId !== undefined) {
      fields.push('tree_document_id = ?');
      values.push(updates.treeDocumentId);
    }

    if (fields.length === 0) return await this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE knowledge_base_contents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }

  private static mapRowToContent(row: any): IKnowledgeBaseContent {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      content: row.content,
      textContent: row.textContent,
      type: row.type,
      status: row.status,
      depth: row.depth,
      filename: row.filename,
      transcription: row.transcription,
      explanation: row.explanation || null,
      sceneExplanation: row.sceneExplanation || null,
      childPages: row.childPages ? (typeof row.childPages === 'string' ? JSON.parse(row.childPages) : row.childPages) : null,
      treeDocumentId: row.treeDocumentId || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default KnowledgeBase;

