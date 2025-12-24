import pool from '../config/database';

export const createUserConnectorModelsTable = async (): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_connector_models (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          connector_id INT NOT NULL,
          model_id INT NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE,
          FOREIGN KEY (model_id) REFERENCES connector_models(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_connector_id (connector_id),
          INDEX idx_model_id (model_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ User connector models table created/verified');
      return; // Success, exit function
    } catch (error: any) {
      // Check if it's a deadlock error (error code 40001)
      if (error.sqlState === '40001' && attempt < maxRetries) {
        console.warn(`⚠️ Deadlock detected (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue; // Retry
      }
      
      // For other errors or if max retries reached, throw
      console.error('❌ Error creating user_connector_models table:', error);
      throw error;
    }
  }
};

