const { db } = require('../database');

/**
 * Ādiens (Food) model for database operations
 * Izseko pārtikas produktus un to uztura vērtības
 */
class FoodModel {
  static tableName = 'foods';

  /**
   * Izveido pārtikas produktu tabulu
   */
  static async createTable() {
    // Izveido tabulu ar uztura informāciju par 100g
    const createFoodsTableSQL = `
      CREATE TABLE IF NOT EXISTS foods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL UNIQUE,
            calories_per_100g DECIMAL(10,2) NOT NULL,
            protein_per_100g DECIMAL(10,2) NOT NULL,
            carbs_per_100g DECIMAL(10,2) NOT NULL,
            fat_per_100g DECIMAL(10,2) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_foods_name (name),
            INDEX idx_foods_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        try {
            await db.executeQuery(createFoodsTableSQL);
            console.log('✅ Foods table created successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Error creating foods tables:', error);
            throw error;
        }
    }

  /**
   * Izveido jaunu pārtikas produktu
   */
  static async createFood(userId, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic = false) {
    // Tiek saglābats produkts ar uztura informāciju uz 100g
    const sql = `
      INSERT INTO foods (user_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [userId, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic];

    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating food:', error);
      throw error;
    }
  }

  /**
   * Iegūst visus pārtikas produktus
   */
  static async findAll() {
    const sql = `
      SELECT id, user_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_public
      FROM foods
      ORDER BY name ASC
    `;

    try {
      return await db.selectAll(sql);
    } catch (error) {
      console.error('❌ Error finding all foods:', error);
      throw error;
    }
  }

  /**
   * Iegūst lietotāja redzamos pārtikas produktus: savus un publiskos
   */
  static async findVisibleToUser(userId) {
    const sql = `
      SELECT id, user_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_public
      FROM foods
      WHERE user_id = ? OR is_public = TRUE
      ORDER BY name ASC
    `;

    try {
      return await db.selectAll(sql, [userId]);
    } catch (error) {
      console.error('❌ Error finding visible foods:', error);
      throw error;
    }
  }

  /**
   * Atrod pārtikas produktu pēc ID
   */
  static async findById(id) {
    const sql = `
      SELECT f.id, f.user_id, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g, f.is_public
      FROM foods f
      WHERE f.id = ?
    `;
    
    try {
      const food = await db.selectOne(sql, [id]);
      return food;
    } catch (error) {
      console.error('❌ Error finding food by ID:', error);
      throw error;
    }
  }

  /**
   * Atrod pārtikas produktu pēc nosaukuma
   */
  static async findByName(name) {
    const sql = `
      SELECT f.id, f.user_id, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g, f.is_public
      FROM foods f
      WHERE f.name = ?
    `;

    try {
      const food = await db.selectOne(sql, [name]);
      return food;
    } catch (error) {
      console.error('❌ Error finding food by name:', error);
      throw error;
    }
  }

  /**
   * Atjaunina pārtikas produktu
   */
  static async update(id, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic) {
    const sql = `
      UPDATE foods
      SET name = ?, calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const result = await db.update(sql, [name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic, id]);
      return result > 0;
    } catch (error) {
      console.error('❌ Error updating food:', error);
      throw error;
    }
  }

}

module.exports = FoodModel;
