import pool from '../config/database';
import bcrypt from 'bcryptjs';

export interface IUser {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  planId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  static async create(userData: IUser): Promise<IUser> {
    const { firstName, lastName, email, password, planId } = userData;

    // Hash password if provided (OAuth users may not have passwords)
    let hashedPassword = null;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const [result]: any = await pool.execute(
      `INSERT INTO users (first_name, last_name, email, password, plan_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [firstName, lastName, email.toLowerCase().trim(), hashedPassword, planId || null]
    );

    const user = await User.findById(result.insertId);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  static async findById(id: number): Promise<IUser | null> {
    const [rows]: any = await pool.execute(
      `SELECT id, first_name as firstName, last_name as lastName, email, plan_id as planId, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToUser(rows[0]);
  }

  static async findByEmail(email: string, includePassword: boolean = false): Promise<IUser | null> {
    const passwordField = includePassword ? ', password' : '';
    const [rows]: any = await pool.execute(
      `SELECT id, first_name as firstName, last_name as lastName, email, plan_id as planId, created_at as createdAt, updated_at as updatedAt${passwordField}
       FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) return null;

    const user = this.mapRowToUser(rows[0]);
    if (includePassword && rows[0].password) {
      (user as any).password = rows[0].password;
    }
    return user;
  }

  static async emailExists(email: string): Promise<boolean> {
    const [rows]: any = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    return rows[0].count > 0;
  }

  static async comparePassword(candidatePassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  private static mapRowToUser(row: any): IUser {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      planId: row.planId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default User;
