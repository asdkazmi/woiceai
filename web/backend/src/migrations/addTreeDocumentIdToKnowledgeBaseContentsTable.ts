import pool from '../config/database';

export const addTreeDocumentIdToKnowledgeBaseContentsTable = async (): Promise<void> => {
  try {
    // Check if column already exists
    const [columns]: any = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'knowledge_base_contents' 
       AND COLUMN_NAME = 'tree_document_id'`
    );

    if (columns.length === 0) {
      await pool.execute(`
        ALTER TABLE knowledge_base_contents
        ADD COLUMN tree_document_id VARCHAR(255) NULL AFTER child_pages,
        ADD INDEX idx_tree_document_id (tree_document_id)
      `);
      console.log('✅ Added tree_document_id column to knowledge_base_contents table');
    } else {
      console.log('ℹ️ tree_document_id column already exists');
    }
  } catch (error) {
    console.error('❌ Error adding tree_document_id column:', error);
    throw error;
  }
};


