import pool from '../config/database';

export const addContentExplanationsToKnowledgeBaseContentsTable = async (): Promise<void> => {
  try {
    // Check if columns already exist
    const [columns]: any = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'knowledge_base_contents' 
       AND COLUMN_NAME IN ('explanation', 'scene_explanation')`
    );

    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);

    if (!existingColumns.includes('explanation')) {
      await pool.execute(`
        ALTER TABLE knowledge_base_contents 
        ADD COLUMN explanation TEXT NULL AFTER transcription
      `);
      console.log('✅ Added explanation column to knowledge_base_contents table');
    }

    if (!existingColumns.includes('scene_explanation')) {
      await pool.execute(`
        ALTER TABLE knowledge_base_contents 
        ADD COLUMN scene_explanation TEXT NULL AFTER explanation
      `);
      console.log('✅ Added scene_explanation column to knowledge_base_contents table');
    }
  } catch (error) {
    console.error('❌ Error adding explanation columns to knowledge_base_contents table:', error);
    throw error;
  }
};

