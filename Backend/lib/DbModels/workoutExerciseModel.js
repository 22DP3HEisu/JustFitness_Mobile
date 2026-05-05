const { db } = require('../database');
const WorkoutSetModel = require('./exerciseSetModel');

/**
 * Treniņu_vingrinājumi modelis datubāzes darbībām
 * Izseko vingrinājumus treniņu plānos
 */
class WorkoutExerciseModel {
  static tableName = 'workout_exercises';

  /**
   * Izveido treniņa vingrinājumu tabulu
   */
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workout_id INT NOT NULL,
        exercise_id INT NOT NULL,
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,

        INDEX idx_workout_id (workout_id)
      )
    `;

    await db.executeQuery(sql);
  }

  /**
   * Pievieno vingrinājumu treniņam
   */
  static async add(workoutId, exerciseId, orderIndex = 0) {
    const sql = `
      INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
      VALUES (?, ?, ?)
    `;

    const result = await db.insert(sql, [workoutId, exerciseId, orderIndex]);
    return result.insertId;
  }

  /**
   * Pievieno vairākus vingrinājumus
   */
  static async addMultiple(workoutId, exercises) {
    for (const ex of exercises) {

      const workoutExerciseId = await this.add(
        workoutId,
        ex.exercise_id,
        ex.order_index || 0
      );

      if (ex.sets?.length) {
        await WorkoutSetModel.addMultiple(workoutExerciseId, ex.sets);
      }
    }
  }

  /**
   * Atjaunina vingrinājuma informāciju
   */
  static async update(id, exerciseId, orderIndex) {
    const sql = `
      UPDATE workout_exercises
      SET exercise_id = ?, order_index = ?
      WHERE id = ?
    `;

    const result = await db.update(sql, [exerciseId, orderIndex, id]);
    return result > 0;
  }

  /**
   * Atrod vingrinājumus pēc treniņu ID
   */
  static async findByWorkoutId(workoutId) {
    const exercises = await db.selectAll(`
      SELECT we.id, we.exercise_id, we.order_index, e.name AS exercise_name
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `, [workoutId]);

    for (const ex of exercises) {
      ex.sets = await WorkoutSetModel.findByExerciseId(ex.id);
    }

    return exercises;
  }

  /**
   * Atrod vingrinājumu pēc ID
   */
  static async findById(id) {
    const sql = `SELECT * FROM workout_exercises WHERE id = ?`;
    return await db.selectOne(sql, [id]);
  }

  /**
   * Dzēš vingrinājumu
   */
  static async delete(id) {
    const sql = `DELETE FROM workout_exercises WHERE id = ?`;
    const result = await db.update(sql, [id]);
    return result > 0;
  }

  /**
   * Dzēš visus vingrinājumus no treniņam
   */
  static async deleteByWorkoutId(workoutId) {
    const sql = `DELETE FROM workout_exercises WHERE workout_id = ?`;
    await db.update(sql, [workoutId]);
  }
}

module.exports = WorkoutExerciseModel;