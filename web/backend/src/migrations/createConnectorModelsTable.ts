import pool from '../config/database';

export const createConnectorModelsTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS connector_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        connector_id INT NOT NULL,
        model VARCHAR(255) NOT NULL,
        settings JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE,
        INDEX idx_connector_id (connector_id),
        INDEX idx_model (model)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Connector models table created/verified');
  } catch (error) {
    console.error('❌ Error creating connector_models table:', error);
    throw error;
  }
};

