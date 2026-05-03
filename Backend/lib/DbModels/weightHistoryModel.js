const { db } = require('../database');

/**
 * Svara_vesture (Weight History) model for database operations
 * Izseko lietotāja svara izmaiņas laika gaitā
 */
class WeightHistoryModel {
  static tableName = 'weight_history';

  /**
   * Izveido weight_history tabulu (palaists vienu reizi iestatīšanas laikā)
   */
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS weight_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    try {
      await db.executeQuery(createTableSQL);
      console.log('✅ Weight history table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating weight history table:', error);
      throw error;
    }
  }

  /**
   * Pievieno jaunu svara ierakstu
   */
  static async addEntry(userId, weight) {
    const sql = `
      INSERT INTO weight_history (user_id, weight)
      VALUES (?, ?)
    `;

    const params = [userId, weight];

    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error adding weight history entry:', error);
      throw error;
    }
  }

  /**
   * Atrod svara ierakstu pēc ID
   */
  static async findById(id) {
    const sql = `
      SELECT id, user_id, weight, created_at
      FROM weight_history
      WHERE id = ?
    `;

    try {
      return await db.selectOne(sql, [id]);
    } catch (error) {
      console.error('❌ Error finding weight history entry by ID:', error);
      throw error;
    }
  }

  /**
   * Atrod visus lietotāja svara ierakstus
   */
  static async findByUserId(userId, limit = 365, offset = 0) {
    const sql = `
      SELECT id, user_id, weight, created_at
      FROM weight_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    try {
      return await db.selectAll(sql, [userId]);
    } catch (error) {
      console.error('❌ Error finding weight history by user ID:', error);
      throw error;
    }
  }

  static async findByPeriod(userId, period = "week") {
    let interval;
    let relativePartition;

    switch (period) {
        case "week": 
            // Latest entry for each of the last 7 days
            interval = "7 DAY";
            relativePartition = "DATEDIFF(CURRENT_DATE(), created_at)"; 
            break;
        case "month": 
            // Latest entry of every 7-day block for the last month
            interval = "1 MONTH";
            relativePartition = "FLOOR(DATEDIFF(CURRENT_DATE(), created_at) / 7)";
            break;
        case "year": 
            // Latest entry of every month for the last year
            interval = "1 YEAR";
            relativePartition = "FLOOR(DATEDIFF(CURRENT_DATE(), created_at) / 60)";
            break;
        default:
            interval = "7 DAY";
            relativePartition = "DATEDIFF(CURRENT_DATE(), created_at)";
    }

    const sql = `
      SELECT id, user_id, weight, created_at
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY ${relativePartition} 
            ORDER BY created_at DESC
          ) as rn
        FROM weight_history
        WHERE user_id = ?
        AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ${interval})
      ) AS ranked_weights
      WHERE rn = 1
      ORDER BY created_at DESC
    `;

    try {
      return await db.selectAll(sql, [userId]);
    } catch (error) {
      console.error('❌ Error in findByPeriod:', error);
      throw error;
    }
  }

  /**
   * Atrod svara ierakstus noteiktam datumu diapazonam
   */
  static async findByDateRange(userId, startDate, endDate) {
    const sql = `
      SELECT id, user_id, weight, created_at
      FROM weight_history
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at ASC
    `;

    try {
      return await db.selectAll(sql, [userId, startDate, endDate]);
    } catch (error) {
      console.error('❌ Error finding weight history by date range:', error);
      throw error;
    }
  }

  /**
   * Atjaunina esošu svara ierakstu
   */
  static async update(id, weight) {
    const sql = `
      UPDATE weight_history
      SET weight = ?
      WHERE id = ?
    `;

    try {
      const rowsAffected = await db.update(sql, [weight, id]);
      if (rowsAffected > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating weight history entry:', error);
      throw error;
    }
  }

  /**
   * Dzēš svara ierakstu
   */
  static async delete(id) {
    const sql = `DELETE FROM weight_history WHERE id = ?`;

    try {
      const rowsAffected = await db.update(sql, [id]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting weight history entry:', error);
      throw error;
    }
  }

  /**
   * Dzēš visus lietotāja svara ierakstus
   */
  static async deleteByUserId(userId) {
    const sql = `DELETE FROM weight_history WHERE user_id = ?`;

    try {
      const rowsAffected = await db.update(sql, [userId]);
      return rowsAffected;
    } catch (error) {
      console.error('❌ Error deleting weight history entries by user ID:', error);
      throw error;
    }
  }

  /**
   * Iegūst pēdējo svara ierakstu lietotājam
   */
  static async getLatestEntry(userId) {
    const sql = `
      SELECT id, user_id, weight, created_at
      FROM weight_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      return await db.selectOne(sql, [userId]);
    } catch (error) {
      console.error('❌ Error getting latest weight history entry:', error);
      throw error;
    }
  }

  /**
   * Aprēķina vidējo svaru par noteiktu periodu
   */
  static async getAverageWeight(userId, startDate, endDate) {
    const sql = `
      SELECT AVG(weight) as average_weight, MIN(weight) as min_weight, MAX(weight) as max_weight
      FROM weight_history
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
    `;

    try {
      return await db.selectOne(sql, [userId, startDate, endDate]);
    } catch (error) {
      console.error('❌ Error calculating average weight:', error);
      throw error;
    }
  }
}

module.exports = WeightHistoryModel;
