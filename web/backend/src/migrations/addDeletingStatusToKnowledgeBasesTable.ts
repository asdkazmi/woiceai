import pool from '../config/database';

export const addDeletingStatusToKnowledgeBasesTable = async (): Promise<void> => {
  try {
    // Check current ENUM values
    const [columns]: any = await pool.execute(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'knowledge_bases' 
       AND COLUMN_NAME = 'status'`
    );

    if (columns.length > 0) {
      const columnType = columns[0].COLUMN_TYPE;
      // Check if 'deleting' is already in the ENUM
      if (!columnType.includes("'deleting'")) {
        // Modify the ENUM to include 'deleting'
        await pool.execute(`
          ALTER TABLE knowledge_bases 
          MODIFY COLUMN status ENUM('pending', 'queued', 'processing', 'indexed', 'failed', 'deleting') DEFAULT 'pending'
        `);
        console.log('✅ Added deleting status to knowledge_bases table');
      } else {
        console.log('ℹ️ deleting status already exists in knowledge_bases table');
      }
    }
  } catch (error) {
    console.error('❌ Error adding deleting status to knowledge_bases table:', error);
    throw error;
  }
};

