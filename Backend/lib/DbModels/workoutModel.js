const { db } = require('../database');
const WorkoutExerciseModel = require('./workoutExerciseModel');

/**
 * Trēnini (Workout) model for database operations
 * Izseko lietotāja trēniņu plānus un vingrinājumus
 */
class WorkoutModel {
  static tableName = 'workouts';

  /**
   * Izveido trēniņu tabulu
   */
  static async createTable() {
    // Izveido tabulu trēniņu plānus ar vingrinājumiem
    const sql = `
      CREATE TABLE IF NOT EXISTS workouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `;

    await db.executeQuery(sql);
  }

  /**
   * Izveido jaunu trēniņu
   */
  static async create(userId, name, description = null) {
    const sql = `
      INSERT INTO workouts (user_id, name, description)
      VALUES (?, ?, ?)
    `;

    const result = await db.insert(sql, [userId, name, description]);
    return this.findById(result.insertId);
  }

  /**
   * Atjaunina trēniņu
   */
  static async update(id, name, description) {
    const sql = `
      UPDATE workouts
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await db.update(sql, [name, description, id]);
    return result > 0;
  }

  /**
   * Atrod trēniņu pēc ID ar tā vingrinājumiem
   */
  static async findById(id) {
    const sql = `SELECT * FROM workouts WHERE id = ?`;
    const workout = await db.selectOne(sql, [id]);

    if (!workout) return null;

    // Pievieno vingrinājumus trēniņam
    workout.exercises = await WorkoutExerciseModel.findByWorkoutId(id);

    return workout;
  }

  /**
   * Atrod lietotāja trēniņus
   */
  static async findByUserId(userId, limit = 50, offset = 0) {
    const sql = `
      SELECT
        w.*,
        (
          SELECT COUNT(*)
          FROM workout_exercises we
          WHERE we.workout_id = w.id
        ) AS exercise_count,
        (
          SELECT COUNT(*)
          FROM workout_exercises we
          JOIN workout_sets ws ON ws.workout_exercise_id = we.id
          WHERE we.workout_id = w.id
        ) AS set_count
      FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    return await db.selectAll(sql, [userId]);
  }

  /**
   * Dzēš trēniņu
   */
  static async delete(id) {
    const sql = `DELETE FROM workouts WHERE id = ?`;
    const result = await db.update(sql, [id]);
    return result > 0;
  }
}

module.exports = WorkoutModel;
