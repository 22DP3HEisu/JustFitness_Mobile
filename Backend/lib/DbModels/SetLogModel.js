const { db } = require('../database');

/**
 * Sesijas_piegājiens (Session/Set Log) model for database operations
 * Izseko atsevišķas viengabala sērijas, kas pabeigtas trenošanas laikā
 */
class ExerciseSetModel {
  static tableName = 'set_logs';
  
  /**
   * Izveido viengabala sērijas žurnālu tabulu
   */
  static async createTable() {
    // Izveido tabulu viengabalu sēriju sīkstajiem datiem
    const sql = `
      CREATE TABLE IF NOT EXISTS set_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exercise_log_id INT NOT NULL,
        set_number INT NOT NULL,
        reps INT NOT NULL,
        weight DECIMAL(6,2),
        rest_duration INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id) ON DELETE CASCADE,
        INDEX idx_exercise_log_id (exercise_log_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.executeQuery(sql);
  }

  /**
   * Pievieno jaunu viengabala sēriju ierakstu
   */
  static async add(exerciseLogId, setNumber, reps, weight = null, restDuration = null) {
    const sql = `
      INSERT INTO set_logs
      (exercise_log_id, set_number, reps, weight, rest_duration)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.insert(sql, [
      exerciseLogId,
      setNumber,
      reps,
      weight,
      restDuration
    ]);

    return result.insertId;
  }

  /**
   * Atrod viengabala sērijas pēc vingrājuma žurnāla ID
   */
  static async findByExerciseLogId(exerciseLogId) {
    const sql = `
      SELECT *
      FROM set_logs
      WHERE exercise_log_id = ?
      ORDER BY set_number ASC
    `;

    return await db.selectAll(sql, [exerciseLogId]);
  }

  /**
   * Atrod setu pec ID
   */
  static async findById(id) {
    const sql = `SELECT * FROM set_logs WHERE id = ?`;
    return await db.selectOne(sql, [id]);
  }

  /**
   * Atrod nakamo seta numuru vingrinajuma ierakstam
   */
  static async getNextSetNumber(exerciseLogId) {
    const sql = `
      SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set_number
      FROM set_logs
      WHERE exercise_log_id = ?
    `;

    const result = await db.selectOne(sql, [exerciseLogId]);
    return result?.next_set_number || 1;
  }

  /**
   * Atjaunina viengabala sēriju
   */
  static async update(id, reps, weight, restDuration = null) {
    const sql = `
      UPDATE set_logs
      SET reps = ?, weight = ?, rest_duration = ?
      WHERE id = ?
    `;

    return (await db.update(sql, [
      reps,
      weight,
      restDuration,
      id
    ])) > 0;
  }

  /**
   * Dzēš viengabala sēriju
   */
  static async delete(id) {
    const sql = `DELETE FROM set_logs WHERE id = ?`;
    return (await db.update(sql, [id])) > 0;
  }

  /**
   * Dzēš visas viengabalu sērijas no vingrājuma
   */
  static async deleteByExerciseLogId(exerciseLogId) {
    const sql = `DELETE FROM set_logs WHERE exercise_log_id = ?`;
    await db.update(sql, [exerciseLogId]);
  }
}

module.exports = ExerciseSetModel;
