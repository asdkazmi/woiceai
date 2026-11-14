import pool from '../config/database';

export const createConnectorsTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS connectors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        llm_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_llm_name (llm_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Connectors table created/verified');
  } catch (error) {
    console.error('❌ Error creating connectors table:', error);
    throw error;
  }
};

