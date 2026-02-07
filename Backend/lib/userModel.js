const { db } = require('./database');

/**
 * User model for database operations
 * MySQL implementation
 */
class UserModel {
  
  /**
   * Create users table (run once during setup)
   */
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        client_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await db.executeQuery(createTableSQL);
      console.log('✅ Users table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating users table:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  static async create(userData) {
    const { email, password, name, phone, clientType } = userData;
    
    const sql = `
      INSERT INTO users (email, password, name, phone, client_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      email.toLowerCase(),
      password,
      name,
      phone || null,
      clientType || 'unknown'
    ];
    
    try {
      const result = await db.insert(sql, params);
      const userId = result.insertId;
      
      // Return the created user (without password)
      return await this.findById(userId);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const sql = `
      SELECT id, email, password, name, phone, client_type, 
             created_at, last_login, is_active
      FROM users 
      WHERE email = ? AND is_active = TRUE
    `;
    
    try {
      const user = await db.selectOne(sql, [email.toLowerCase()]);
      return user;
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const sql = `
      SELECT id, email, name, phone, client_type, 
             created_at, last_login, is_active
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `;
    
    try {
      const user = await db.selectOne(sql, [id]);
      return user;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [userId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT id, email, name, phone, client_type, 
             created_at, last_login, is_active
      FROM users 
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    try {
      const users = await db.selectAll(sql, [limit, offset]);
      return users;
    } catch (error) {
      console.error('❌ Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Count total users
   */
  static async count() {
    const sql = 'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE';
    
    try {
      const result = await db.selectOne(sql);
      return result.total;
    } catch (error) {
      console.error('❌ Error counting users:', error);
      throw error;
    }
  }

  /**
   * Soft delete user (deactivate)
   */
  static async deactivate(userId) {
    const sql = `
      UPDATE users 
      SET is_active = FALSE 
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [userId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    const allowedFields = ['name', 'phone'];
    const updateFields = [];
    const params = [];
    
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND is_active = TRUE
    `;
    
    try {
      const updateParams = [...params, userId];
      const rowsAffected = await db.update(sql, updateParams);
      if (rowsAffected > 0) {
        return await this.findById(userId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }
}

module.exports = UserModel;