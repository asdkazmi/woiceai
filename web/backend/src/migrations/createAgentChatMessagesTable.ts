import pool from '../config/database';

export const createAgentChatMessagesTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agent_chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id INT NOT NULL,
        user_id INT NOT NULL,
        execution_id INT,
        role ENUM('user', 'assistant', 'system') NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (execution_id) REFERENCES agent_executions(id) ON DELETE SET NULL,
        INDEX idx_agent_id (agent_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Add new columns if they don't exist (for existing tables)
    // MySQL doesn't support IF NOT EXISTS in ALTER TABLE, so we check first
    const [columns]: any = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_chat_messages'
    `);
    
    const columnNames = columns.map((col: any) => col.COLUMN_NAME);
    
    if (!columnNames.includes('references_json')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN references_json JSON NULL`);
      console.log('✅ Added references_json column to agent_chat_messages');
    }
    
    if (!columnNames.includes('execution_time')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN execution_time VARCHAR(255) NULL`);
      console.log('✅ Added execution_time column to agent_chat_messages');
    }
    
    if (!columnNames.includes('delay_time')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN delay_time VARCHAR(255) NULL`);
      console.log('✅ Added delay_time column to agent_chat_messages');
    }
    
    if (!columnNames.includes('input_tokens')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN input_tokens INT NULL`);
      console.log('✅ Added input_tokens column to agent_chat_messages');
    }
    
    if (!columnNames.includes('output_tokens')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN output_tokens INT NULL`);
      console.log('✅ Added output_tokens column to agent_chat_messages');
    }
    
    if (!columnNames.includes('total_tokens')) {
      await pool.execute(`ALTER TABLE agent_chat_messages ADD COLUMN total_tokens INT NULL`);
      console.log('✅ Added total_tokens column to agent_chat_messages');
    }
    console.log('✅ Agent chat messages table created');
  } catch (error) {
    console.error('❌ Error creating agent_chat_messages table:', error);
    throw error;
  }
};

