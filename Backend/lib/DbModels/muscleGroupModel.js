const { db } = require('../database');

/**
 * Muscle Group model for database operations
 * MySQL implementation
 */
class MuscleGroupModel {
  
  /**
   * Create muscle_groups table
   */
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS muscle_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_muscle_groups_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await db.executeQuery(createTableSQL);
      console.log('✅ Muscle groups table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating muscle groups table:', error);
      throw error;
    }
  }

  /**
   * Create a new muscle group
   */
  static async create(name, description = null) {
    const sql = `
      INSERT INTO muscle_groups (name, description)
      VALUES (?, ?)
    `;
    
    const params = [name, description];
    
    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating muscle group:', error);
      throw error;
    }
  }

  /**
   * Find muscle group by ID
   */
  static async findById(id) {
    const sql = `
      SELECT id, name, description, created_at, updated_at
      FROM muscle_groups
      WHERE id = ?
    `;
    
    try {
      return await db.selectOne(sql, [id]);
    } catch (error) {
      console.error('❌ Error finding muscle group by ID:', error);
      throw error;
    }
  }

  /**
   * Find muscle group by name
   */
  static async findByName(name) {
    const sql = `
      SELECT id, name, description, created_at, updated_at
      FROM muscle_groups
      WHERE name = ?
    `;
    
    try {
      return await db.selectOne(sql, [name]);
    } catch (error) {
      console.error('❌ Error finding muscle group by name:', error);
      throw error;
    }
  }

  /**
   * Get all muscle groups
   */
  static async findAll() {
    const sql = `
      SELECT id, name, description, created_at, updated_at
      FROM muscle_groups
      ORDER BY name ASC
    `;
    
    try {
      return await db.selectAll(sql);
    } catch (error) {
      console.error('❌ Error finding all muscle groups:', error);
      throw error;
    }
  }

  /**
   * Update muscle group
   */
  static async update(id, name, description) {
    const sql = `
      UPDATE muscle_groups
      SET name = ?, description = ?
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [name, description, id]);
      if (rowsAffected > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating muscle group:', error);
      throw error;
    }
  }

  /**
   * Delete muscle group
   */
  static async delete(id) {
    const sql = `DELETE FROM muscle_groups WHERE id = ?`;
    
    try {
      const rowsAffected = await db.update(sql, [id]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting muscle group:', error);
      throw error;
    }
  }
}

module.exports = MuscleGroupModel;
