import pool from '../config/database';

export const createChatAisTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chat_ais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        knowledge_base_id INT NOT NULL,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        llm_name VARCHAR(50) NOT NULL DEFAULT 'qwen',
        model_name VARCHAR(255) NOT NULL DEFAULT 'Qwen-14b-Instruct',
        settings JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_knowledge_base_id (knowledge_base_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Chat AIs table created');
  } catch (error) {
    console.error('❌ Error creating chat_ais table:', error);
    throw error;
  }
};

