const { db } = require('../database');

/**
 * Lietotāja_iestatījumi (User Settings) model for database operations
 * Izseko lietotāja personīgos iestatījumus un mērķus
 */
class UserSettingsModel {
  static tableName = 'user_settings';

  /**
   * Izveido lietotāja iestatījumu tabulu
   */
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        language VARCHAR(5),
        gender VARCHAR(20),
        birth_date DATE,
        height DECIMAL(5,2),
        weight_unit VARCHAR(5),
        height_unit VARCHAR(5),
        distance_unit VARCHAR(5),
        goal_weight DECIMAL(5,2),
        calorie_goal DECIMAL(10,2),
        protein_goal DECIMAL(10,2),
        fat_goal DECIMAL(10,2),
        carb_goal DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    try {
      await db.executeQuery(createTableSQL);
      console.log('✅ User settings table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating user settings table:', error);
      throw error;
    }
  }

  /**
   * Izveido jaunus lietotāja iestatījumus
   */
  static async create(userId, settings = {}) {
    const {
      language = null,
      gender = null,
      birthDate = null,
      height = null,
      weightUnit = null,
      heightUnit = null,
      distanceUnit = null,
      goalWeight = null,
      calorieGoal = null,
      proteinGoal = null,
      fatGoal = null,
      carbGoal = null
    } = settings;

    const sql = `
      INSERT INTO user_settings (user_id, language, gender, birth_date, height, weight_unit, height_unit, distance_unit, goal_weight, calorie_goal, protein_goal, fat_goal, carb_goal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [userId, language, gender, birthDate, height, weightUnit, heightUnit, distanceUnit, goalWeight, calorieGoal, proteinGoal, fatGoal, carbGoal];

    try {
      const result = await db.insert(sql, params);
      return await this.findByUserId(userId);
    } catch (error) {
      console.error('❌ Error creating user settings:', error);
      throw error;
    }
  }

  /**
   * Atrod lietotāja iestatījumus pēc lietotāja ID
   */
  static async findByUserId(userId) {
    const sql = `
      SELECT id, user_id, language, gender, birth_date, height, weight_unit, height_unit, distance_unit, goal_weight, calorie_goal, protein_goal, fat_goal, carb_goal, created_at, updated_at
      FROM user_settings
      WHERE user_id = ?
    `;

    try {
      return await db.selectOne(sql, [userId]);
    } catch (error) {
      console.error('❌ Error finding user settings by user ID:', error);
      throw error;
    }
  }

  /**
   * Atrod lietotāja iestatījumus pēc ID
   */
  static async findById(id) {
    const sql = `
      SELECT id, user_id, language, gender, birth_date, height, weight_unit, height_unit, distance_unit, goal_weight, calorie_goal, protein_goal, fat_goal, carb_goal, created_at, updated_at
      FROM user_settings
      WHERE id = ?
    `;

    try {
      return await db.selectOne(sql, [id]);
    } catch (error) {
      console.error('❌ Error finding user settings by ID:', error);
      throw error;
    }
  }

  /**
   * Atjaunina lietotāja iestatījumus
   */
  static async update(userId, updates) {
    // Atļautie lauki, ko var atjaunināt
    const allowedFields = ['language', 'gender', 'birth_date', 'height', 'weight_unit', 'height_unit', 'distance_unit', 'goal_weight', 'calorie_goal', 'protein_goal', 'fat_goal', 'carb_goal'];
    const updateFields = [];
    const params = [];

    for (const [field, value] of Object.entries(updates)) {
      // Konvertē camelCase uz snake_case
      const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (allowedFields.includes(snakeCase) && value !== undefined) {
        updateFields.push(`${snakeCase} = ?`);
        params.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('Nav derīgu lauku atjauninājumam');
    }

    const sql = `
      UPDATE user_settings
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    try {
      const updateParams = [...params, userId];
      const rowsAffected = await db.update(sql, updateParams);
      if (rowsAffected > 0) {
        return await this.findByUserId(userId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Atjaunina vienu konkrētu iestatījumu
   */
  static async updateSetting(userId, setting, value) {
    // Konvertē camelCase uz snake_case
    const snakeCase = setting.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    const sql = `
      UPDATE user_settings
      SET ${snakeCase} = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    try {
      const rowsAffected = await db.update(sql, [value, userId]);
      if (rowsAffected > 0) {
        return await this.findByUserId(userId);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user setting:', error);
      throw error;
    }
  }

  /**
   * Dzēš lietotāja iestatījumus
   */
  static async delete(userId) {
    const sql = `DELETE FROM user_settings WHERE user_id = ?`;

    try {
      const rowsAffected = await db.update(sql, [userId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting user settings:', error);
      throw error;
    }
  }

  /**
   * Nodrošina, ka lietotājam ir iestatījumi (izveido noklusējumus, ja nepieciešams)
   */
  static async ensureSettingsExist(userId) {
    const existing = await this.findByUserId(userId);
    
    if (!existing) {
      return await this.create(userId);
    }
    
    return existing;
  }
}

module.exports = UserSettingsModel;
