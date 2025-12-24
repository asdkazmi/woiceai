import pool from '../config/database';

export const createChatAiMessagesTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chat_ai_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_ai_id INT NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT NOT NULL,
        references_json JSON NULL,
        execution_time VARCHAR(255) NULL,
        delay_time VARCHAR(255) NULL,
        input_tokens INT NULL,
        output_tokens INT NULL,
        total_tokens INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_ai_id) REFERENCES chat_ais(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_chat_ai_id (chat_ai_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Chat AI messages table created');
    
    // Add token columns if they don't exist (for existing tables)
    try {
      // Check if columns exist by querying information_schema
      const [columns]: any = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'chat_ai_messages' 
        AND COLUMN_NAME IN ('input_tokens', 'output_tokens', 'total_tokens')
      `);
      
      const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
      
      if (!existingColumns.includes('input_tokens')) {
        await pool.execute(`ALTER TABLE chat_ai_messages ADD COLUMN input_tokens INT NULL`);
      }
      if (!existingColumns.includes('output_tokens')) {
        await pool.execute(`ALTER TABLE chat_ai_messages ADD COLUMN output_tokens INT NULL`);
      }
      if (!existingColumns.includes('total_tokens')) {
        await pool.execute(`ALTER TABLE chat_ai_messages ADD COLUMN total_tokens INT NULL`);
      }
    } catch (alterError: any) {
      // Ignore error if columns already exist
      if (!alterError.message?.includes('Duplicate column')) {
        console.warn('Warning: Could not add token columns:', alterError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error creating chat_ai_messages table:', error);
    throw error;
  }
};

