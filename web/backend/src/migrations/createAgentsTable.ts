import pool from '../config/database';

export const createAgentsTable = async (): Promise<void> => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        agent_data JSON NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_published (is_published)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Agents table created');

    // Check if agent_data column exists using DESCRIBE (more reliable)
    try {
      const [columns]: any = await pool.execute(`DESCRIBE agents`);
      const columnNames = columns.map((col: any) => col.Field);
      const hasAgentData = columnNames.includes('agent_data');
      
      if (!hasAgentData) {
        // Column doesn't exist, add it
        await pool.execute(`
          ALTER TABLE agents 
          ADD COLUMN agent_data JSON NOT NULL AFTER description
        `);
        console.log('✅ Added agent_data column to agents table');
      } else {
        console.log('ℹ️  Column agent_data already exists in agents table');
      }
    } catch (alterError: any) {
      // If DESCRIBE fails, try to add the column anyway
      try {
        await pool.execute(`
          ALTER TABLE agents 
          ADD COLUMN agent_data JSON NOT NULL AFTER description
        `);
        console.log('✅ Added agent_data column to agents table');
      } catch (addError: any) {
        const errorCode = addError.code || addError.errno;
        const errorMessage = addError.message || '';
        
        if (errorCode === 1060 || 
            errorMessage.includes('Duplicate column name') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('Duplicate')) {
          console.log('ℹ️  Column agent_data already exists in agents table');
        } else {
          console.warn('⚠️  Error checking/adding agent_data column:', {
            code: errorCode,
            message: errorMessage,
            sqlState: addError.sqlState
          });
        }
      }
    }

    // Check if is_published column exists using DESCRIBE (more reliable)
    try {
      const [columns]: any = await pool.execute(`DESCRIBE agents`);
      const columnNames = columns.map((col: any) => col.Field);
      const hasIsPublished = columnNames.includes('is_published');
      
      if (!hasIsPublished) {
        // Check if index exists first (might exist without column, which is invalid)
        try {
          await pool.execute(`DROP INDEX idx_is_published ON agents`);
          console.log('ℹ️  Dropped existing idx_is_published index (will recreate after adding column)');
        } catch (dropError: any) {
          // Index doesn't exist, that's fine
        }
        
        // Column doesn't exist, add it
        await pool.execute(`
          ALTER TABLE agents 
          ADD COLUMN is_published BOOLEAN DEFAULT FALSE AFTER agent_data
        `);
        console.log('✅ Added is_published column to agents table');
        
        // Try to add index if it doesn't exist
        try {
          await pool.execute(`
            CREATE INDEX idx_is_published ON agents (is_published)
          `);
          console.log('✅ Added idx_is_published index to agents table');
        } catch (indexError: any) {
          // Index might already exist, that's fine
          if (indexError.message && !indexError.message.includes('Duplicate key name')) {
            console.log('ℹ️  Index idx_is_published may already exist');
          }
        }
      } else {
        console.log('ℹ️  Column is_published already exists in agents table');
      }
    } catch (alterError: any) {
      // If DESCRIBE fails, try to add the column anyway
      try {
        await pool.execute(`
          ALTER TABLE agents 
          ADD COLUMN is_published BOOLEAN DEFAULT FALSE AFTER agent_data
        `);
        console.log('✅ Added is_published column to agents table');
      } catch (addError: any) {
        const errorCode = addError.code || addError.errno;
        const errorMessage = addError.message || '';
        
        if (errorCode === 1060 || 
            errorMessage.includes('Duplicate column name') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('Duplicate')) {
          console.log('ℹ️  Column is_published already exists in agents table');
        } else {
          console.warn('⚠️  Error checking/adding is_published column:', {
            code: errorCode,
            message: errorMessage,
            sqlState: addError.sqlState
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error creating agents table:', error);
    throw error;
  }
};

