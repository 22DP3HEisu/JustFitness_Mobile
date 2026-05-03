const { db } = require('../database');

class ExerciseSetModel {
  static tableName = 'workout_sets';

  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS workout_sets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workout_exercise_id INT NOT NULL,
        set_number INT NOT NULL,
        reps INT DEFAULT 0,
        weight DECIMAL(6,2) DEFAULT NULL,
        rest_duration INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,

        INDEX idx_workout_exercise_id (workout_exercise_id)
      )
    `;

    await db.executeQuery(sql);
  }

  static async add(workoutExerciseId, setNumber, reps, weight = null) {
    const sql = `
      INSERT INTO workout_sets
      (workout_exercise_id, set_number, reps, weight)
      VALUES (?, ?, ?, ?)
    `;

    const result = await db.insert(sql, [
      workoutExerciseId,
      setNumber,
      reps,
      weight
    ]);

    return result.insertId;
  }

  static async addMultiple(workoutExerciseId, sets) {
    if (!sets?.length) return;

    const placeholders = sets.map(() => '(?, ?, ?, ?)').join(', ');

    const sql = `
      INSERT INTO workout_sets
      (workout_exercise_id, set_number, reps, weight)
      VALUES ${placeholders}
    `;

    const params = sets.flatMap(set => [
      workoutExerciseId,
      set.set_number,
      set.reps,
      set.weight || null
    ]);

    await db.insert(sql, params);
  }

  static async update(id, reps, weight, restDuration = null) {
    const sql = `
      UPDATE workout_sets
      SET reps = ?, weight = ?, rest_duration = ?
      WHERE id = ?
    `;

    const result = await db.update(sql, [
      reps,
      weight,
      restDuration,
      id
    ]);

    return result > 0;
  }

  static async findById(id) {
    const sql = `SELECT * FROM workout_sets WHERE id = ?`;
    return await db.selectOne(sql, [id]);
  }

  static async findByExerciseId(workoutExerciseId) {
    const sql = `
      SELECT *
      FROM workout_sets
      WHERE workout_exercise_id = ?
      ORDER BY set_number ASC
    `;

    return await db.selectAll(sql, [workoutExerciseId]);
  }

  static async delete(id) {
    const sql = `DELETE FROM workout_sets WHERE id = ?`;
    const result = await db.update(sql, [id]);
    return result > 0;
  }

  static async deleteByExerciseId(workoutExerciseId) {
    const sql = `DELETE FROM workout_sets WHERE workout_exercise_id = ?`;
    await db.update(sql, [workoutExerciseId]);
  }
}

module.exports = ExerciseSetModel;