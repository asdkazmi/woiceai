import pool from '../config/database';

export const addRestrictedQuerySupport = async (): Promise<void> => {
  try {
    // First, modify the type ENUM to include 'restricted_query'
    await pool.execute(`
      ALTER TABLE knowledge_base_contents 
      MODIFY COLUMN type ENUM('file', 'url', 'text', 'audio', 'video', 'image', 'restricted_query') NOT NULL
    `);

    // Then, modify the status ENUM to include 'non-indexing'
    await pool.execute(`
      ALTER TABLE knowledge_base_contents 
      MODIFY COLUMN status ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'non-indexing') DEFAULT 'pending'
    `);

    console.log('✅ Restricted query support added to knowledge_base_contents table');
  } catch (error) {
    console.error('❌ Error adding restricted query support:', error);
    throw error;
  }
};

