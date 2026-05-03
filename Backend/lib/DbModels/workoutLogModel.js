const { db } = require('../database');

/**
 * Treniņu_piegājiens (Workout Session) model for database operations
 * Izseko lietotāja treniņu sesijas un to statuss
 */
class WorkoutLogModel {
  static tableName = 'workout_logs';
  
  /**
   * Izveido treniņu sesiju žurnāla tabulu
   */
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS workout_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_id INT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,

        INDEX idx_user_id (user_id),
        INDEX idx_workout_id (workout_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.executeQuery(sql);
  }

  /**
   * Sāk jaunu treniņu sesiju
   */
  static async start(userId, workoutId) {
    const sql = `
      INSERT INTO workout_logs (user_id, workout_id)
      VALUES (?, ?)
    `;

    const result = await db.insert(sql, [userId, workoutId]);
    return this.findById(result.insertId);
  }

  /**
   * Pabeig treniņu sesiju
   */
  static async complete(id) {
    const sql = `
      UPDATE workout_logs
      SET completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return (await db.update(sql, [id])) > 0;
  }

  /**
   * Atrod treniņu sesiju pēc ID
   */
  static async findById(id) {
    const sql = `SELECT * FROM workout_logs WHERE id = ?`;
    return await db.selectOne(sql, [id]);
  }

  /**
   * Atrod lietotāja treniņu sesijas
   */
  static async findByUserId(userId, limit = 50, offset = 0) {
    const sql = `
      SELECT *
      FROM workout_logs
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    return await db.selectAll(sql, [userId]);
  }

  /**
   * Atrod nepābeigu treniņu sesiju
   */
  static async getOngoing(userId) {
    const sql = `
      SELECT *
      FROM workout_logs
      WHERE user_id = ? AND completed_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `;
    return await db.selectOne(sql, [userId]);
  }

  /**
   * Dzēš treniņu sesiju
   */
  static async delete(id) {
    const sql = `DELETE FROM workout_logs WHERE id = ?`;
    return (await db.update(sql, [id])) > 0;
  }
}

module.exports = WorkoutLogModel;