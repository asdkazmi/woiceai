import pool from '../config/database';

export const addScrappingStatusToKnowledgeBaseContentsTable = async (): Promise<void> => {
  try {
    // Check if column already exists
    const [columns]: any = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'knowledge_base_contents' 
       AND COLUMN_NAME = 'scrapping_status'`
    );

    if (columns.length === 0) {
      await pool.execute(`
        ALTER TABLE knowledge_base_contents 
        ADD COLUMN scrapping_status VARCHAR(50) NULL AFTER scene_explanation
      `);
      console.log('✅ Added scrapping_status column to knowledge_base_contents table');
    } else {
      console.log('ℹ️ scrapping_status column already exists');
    }
  } catch (error) {
    console.error('❌ Error adding scrapping_status column:', error);
    throw error;
  }
};

