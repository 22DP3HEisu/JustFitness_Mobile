const { db } = require('../database');

class WaterLogModel {
  static tableName = 'water_logs';

  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS water_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount_ml INT NOT NULL,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_water_logs_user_date (user_id, logged_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.executeQuery(createTableSQL);
    console.log('✅ Water logs table created successfully');
    return true;
  }

  static async findByUserAndDate(userId, date = null) {
    const sql = `
      SELECT id, user_id, amount_ml, logged_at, created_at
      FROM water_logs
      WHERE user_id = ?
        AND DATE(logged_at) = COALESCE(?, CURDATE())
      ORDER BY logged_at DESC, id DESC
    `;

    return await db.selectAll(sql, [userId, date]);
  }

  static async create(userId, amountMl, loggedAt = null) {
    const sql = `
      INSERT INTO water_logs (user_id, amount_ml, logged_at)
      VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `;

    const result = await db.insert(sql, [userId, amountMl, loggedAt]);
    return await db.selectOne(`
      SELECT id, user_id, amount_ml, logged_at, created_at
      FROM water_logs
      WHERE id = ?
    `, [result.insertId]);
  }

  static async findById(id) {
    return await db.selectOne(`
      SELECT id, user_id, amount_ml, logged_at, created_at
      FROM water_logs
      WHERE id = ?
    `, [id]);
  }

  static async delete(id) {
    const rowsAffected = await db.update('DELETE FROM water_logs WHERE id = ?', [id]);
    return rowsAffected > 0;
  }
}

module.exports = WaterLogModel;
