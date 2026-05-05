const { db } = require('../database');

/**
 * Lietotāja modelis datubāzes operācijām
 * MySQL īstenojums
 */
class UserModel {
  static tableName = 'users';
  
  /**
   * Izveido lietotāju tabulu (palaists vienu reizi iestatīšanas laikā)
   */
  static async createTable() {
    // Izveido galveno lietotāju tabulu ar pamata informāciju
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await db.executeQuery(createTableSQL);
      await this.ensureRoleColumn();
      console.log('✅ Users table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating users table:', error);
      throw error;
    }
  }

  static async ensureRoleColumn() {
    const column = await db.selectOne(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'role'
    `);

    if (!column) {
      await db.executeQuery(`
        ALTER TABLE users
        ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
        AFTER name
      `);
    }
  }

  /**
   * Izveido jaunu lietotāju
   */
  static async create(userData) {
    const { email, password, name } = userData;
    
    const sql = `
      INSERT INTO users (email, password, name)
      VALUES (?, ?, ?)
    `;
    
    const params = [
      email.toLowerCase(),
      password,
      name
    ];
    
    try {
      const result = await db.insert(sql, params);
      const userId = result.insertId;
      
      // Atgriež izveidoto lietotāju (bez paroles)
      return await this.findById(userId);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Atrod lietotāju pēc e-pasta
   */
  static async findByEmail(email) {
    const sql = `
      SELECT id, email, password, name, role, created_at, last_login, is_active
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
   * Atrod lietotāju pēc ID
   */
  static async findById(id, includePassword = false) {
    const fields = includePassword 
      ? 'id, email, password, name, role, created_at, last_login, is_active'
      : 'id, email, name, role, created_at, last_login, is_active';
    
    const sql = `
      SELECT ${fields}
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

  static async findByIdForAdmin(id) {
    const sql = `
      SELECT id, email, name, role, created_at, last_login, is_active
      FROM users 
      WHERE id = ?
    `;

    try {
      return await db.selectOne(sql, [id]);
    } catch (error) {
      console.error('âŒ Error finding user by ID for admin:', error);
      throw error;
    }
  }

  static async findByEmailIncludingInactive(email) {
    const sql = `
      SELECT id, email, password, name, role, created_at, last_login, is_active
      FROM users 
      WHERE email = ?
    `;

    try {
      return await db.selectOne(sql, [email.toLowerCase()]);
    } catch (error) {
      console.error('âŒ Error finding user by email including inactive:', error);
      throw error;
    }
  }

  /**
   * Atjaunina pēdējā pierakstīšanās laiku
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
   * Iegūst visus lietotājus (administratora nolūkiem)
   */
  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT id, email, name, role, created_at, last_login, is_active
      FROM users 
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    
    try {
      const users = await db.selectAll(sql, []);
      return users;
    } catch (error) {
      console.error('❌ Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Aprēķina kopējo lietotāju skaitu
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
   * Mīksti dzēš lietotāju (deaktivizē)
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

  static async reactivate(userId) {
    const sql = `
      UPDATE users 
      SET is_active = TRUE 
      WHERE id = ?
    `;

    try {
      const rowsAffected = await db.update(sql, [userId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('âŒ Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Atjaunina lietotāja profila informāciju
   */
  static async updateProfile(userId, updates) {
    // Atļautie lauki, ko var atjaunināt
    const allowedFields = ['name', 'email', 'role'];
    const updateFields = [];
    const params = [];
    
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        if (field === 'role' && !['user', 'admin'].includes(value)) {
          throw new Error('Invalid role');
        }

        updateFields.push(`${field} = ?`);
        params.push(field === 'email' ? value.toLowerCase() : value);
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    try {
      const updateParams = [...params, userId];
      const rowsAffected = await db.update(sql, updateParams);
      if (rowsAffected > 0) {
        return await this.findByIdForAdmin(userId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Atjaunina lietotāja paroli
   */
  static async updatePassword(userId, hashedPassword) {
    const sql = `
      UPDATE users 
      SET password = ?
      WHERE id = ? AND is_active = TRUE
    `;
    
    try {
      const rowsAffected = await db.update(sql, [hashedPassword, userId]);
      if (rowsAffected > 0) {
        return await this.findById(userId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user password:', error);
      throw error;
    }
  }
}

module.exports = UserModel;
