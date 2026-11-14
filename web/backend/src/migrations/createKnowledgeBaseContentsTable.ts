import pool from '../config/database';

export const createKnowledgeBaseContentsTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_base_contents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        knowledge_base_id INT NOT NULL,
        content TEXT NOT NULL,
        text_content TEXT NULL,
        type ENUM('file', 'url', 'text', 'audio', 'video', 'image') NOT NULL,
        status ENUM('pending', 'queued', 'processing', 'completed', 'failed') DEFAULT 'pending',
        depth INT NULL,
        filename VARCHAR(255) NULL,
        transcription TEXT NULL,
        child_pages JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        INDEX idx_knowledge_base_id (knowledge_base_id),
        INDEX idx_type (type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Knowledge base contents table created');
  } catch (error) {
    console.error('❌ Error creating knowledge_base_contents table:', error);
    throw error;
  }
};

