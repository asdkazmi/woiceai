import pool from '../config/database';

export const createConnectorUserTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS connector_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        connector_id INT NOT NULL,
        api_key VARCHAR(500) DEFAULT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        dialogue_mode VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_connector (user_id, connector_id),
        INDEX idx_user_id (user_id),
        INDEX idx_connector_id (connector_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Connector user table created/verified');
  } catch (error) {
    console.error('❌ Error creating connector_user table:', error);
    throw error;
  }
};

