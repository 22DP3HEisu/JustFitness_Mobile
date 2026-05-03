const { db } = require('../database');

/**
 * Sesijas_vingrājumi (Session Exercises) model for database operations
 * Izseko vingrinājumus, kas pabeigti konkrētas treniņu sesijas laikā
 */
class ExerciseLogModel {
  static tableName = 'exercise_logs';
  
  /**
   * Izveido vingrinājumu žurnāla tabulu treniņu sesijām
   */
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS exercise_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workout_log_id INT NOT NULL,
        exercise_id INT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,

        INDEX idx_workout_log_id (workout_log_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.executeQuery(sql);
  }

  /**
   * Pievieno jaunu vingrinājuma ierakstu
   */
  static async add(workoutLogId, exerciseId, notes = null) {
    const sql = `
      INSERT INTO exercise_logs (workout_log_id, exercise_id, notes)
      VALUES (?, ?, ?)
    `;

    const result = await db.insert(sql, [workoutLogId, exerciseId, notes]);
    return result.insertId;
  }

  /**
   * Pievieno vairākus vingrinājuma ierakstus
   */
  static async addMultiple(workoutLogId, exercises) {
    if (!exercises?.length) return;

    const placeholders = exercises.map(() => `(?, ?, ?)`).join(', ');

    const sql = `
      INSERT INTO exercise_logs (workout_log_id, exercise_id, notes)
      VALUES ${placeholders}
    `;

    const params = exercises.flatMap(ex => [
      workoutLogId,
      ex.exercise_id,
      ex.notes ?? null
    ]);

    await db.insert(sql, params);
  }

  /**
   * Atrod vingrinājumus pēc treniņu žurnāla ID
   */
  static async findByWorkoutLogId(workoutLogId) {
    const sql = `
      SELECT
        el.*,
        e.name AS exercise_name,
        e.description AS exercise_description
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
      WHERE el.workout_log_id = ?
      ORDER BY el.created_at ASC, el.id ASC
    `;

    return await db.selectAll(sql, [workoutLogId]);
  }

  /**
   * Atrod vingrinajuma ierakstu pec ID
   */
  static async findById(id) {
    const sql = `
      SELECT
        el.*,
        e.name AS exercise_name,
        e.description AS exercise_description
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
      WHERE el.id = ?
    `;

    return await db.selectOne(sql, [id]);
  }

  /**
   * Atjaunina vingrinajuma piezimes
   */
  static async update(id, notes = null) {
    const sql = `
      UPDATE exercise_logs
      SET notes = ?
      WHERE id = ?
    `;

    return (await db.update(sql, [notes, id])) > 0;
  }

  /**
   * Dzēš vingrinājuma ierakstu
   */
  static async delete(id) {
    const sql = `DELETE FROM exercise_logs WHERE id = ?`;
    return (await db.update(sql, [id])) > 0;
  }

  /**
   * Dzēš visus vingrinājuma ierakstus no treniņu sesijas
   */
  static async deleteByWorkoutLogId(workoutLogId) {
    const sql = `DELETE FROM exercise_logs WHERE workout_log_id = ?`;
    await db.update(sql, [workoutLogId]);
  }
}

module.exports = ExerciseLogModel;
