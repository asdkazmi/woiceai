import pool from '../config/database';

export const addIsPublishedToChatAisTable = async (): Promise<void> => {
  try {
    // Check if column exists first
    const [columns]: any = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'chat_ais' 
      AND COLUMN_NAME = 'is_published'
    `);

    if (columns.length === 0) {
      // Column doesn't exist, add it
      await pool.execute(`
        ALTER TABLE chat_ais 
        ADD COLUMN is_published BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_published column to chat_ais table');
    } else {
      console.log('ℹ️  Column is_published already exists in chat_ais table');
    }
  } catch (error: any) {
    console.error('❌ Error adding is_published column to chat_ais table:', error);
    throw error;
  }
};

