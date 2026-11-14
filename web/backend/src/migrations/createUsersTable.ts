import pool from '../config/database';

export const createUsersTable = async (): Promise<void> => {
  try {
    // Create table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) DEFAULT NULL,
        plan_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure password column allows NULL (in case table was created with NOT NULL constraint)
    try {
      await pool.execute(`
        ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL
      `);
    } catch (alterError: any) {
      // Ignore error if column doesn't exist or is already correct
      // This is fine - we just want to ensure it allows NULL if it exists
      if (!alterError.message.includes('Duplicate column name')) {
        console.log('Note: Could not alter password column (may already be correct)');
      }
    }

    console.log('✅ Users table created/verified');
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    throw error;
  }
};

