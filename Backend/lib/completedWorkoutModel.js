const { db } = require('./database');

/**
 * Completed Workout model for tracking workout history
 * Stores records of workouts that users have completed
 */
class CompletedWorkoutModel {
  
  /**
   * Create completed_workouts table
   */
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS completed_workouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        workout_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INT,
        calories_burned INT,
        notes TEXT,
        rating TINYINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_workout_id (workout_id),
        INDEX idx_completed_at (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await db.executeQuery(createTableSQL);
      console.log('✅ Completed workouts table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating completed_workouts table:', error);
      throw error;
    }
  }

  /**
   * Record a completed workout
   */
  static async create(userId, workoutId, durationMinutes = null, caloriesBurned = null, notes = null, rating = null) {
    const sql = `
      INSERT INTO completed_workouts (user_id, workout_id, duration_minutes, calories_burned, notes, rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await db.insert(sql, [userId, workoutId, durationMinutes, caloriesBurned, notes, rating]);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error recording completed workout:', error);
      throw error;
    }
  }

  /**
   * Find completed workout by ID
   */
  static async findById(id) {
    const sql = `
      SELECT cw.*, w.name as workout_name, w.description as workout_description
      FROM completed_workouts cw
      INNER JOIN workouts w ON cw.workout_id = w.id
      WHERE cw.id = ?
    `;
    
    try {
      return await db.selectOne(sql, [id]);
    } catch (error) {
      console.error('❌ Error finding completed workout by ID:', error);
      throw error;
    }
  }

  /**
   * Get latest completed workouts for a user
   */
  static async getLatestByUserId(userId, limit = 10) {
    const sql = `
      SELECT cw.*, w.name as workout_name, w.description as workout_description
      FROM completed_workouts cw
      INNER JOIN workouts w ON cw.workout_id = w.id
      WHERE cw.user_id = ?
      ORDER BY cw.completed_at DESC
      LIMIT ${parseInt(limit)}
    `;
    
    try {
      return await db.selectAll(sql, [userId]);
    } catch (error) {
      console.error('❌ Error getting latest completed workouts:', error);
      throw error;
    }
  }

  /**
   * Get all completed workouts for a user with pagination
   */
  static async findByUserId(userId, limit = 50, offset = 0) {
    const sql = `
      SELECT cw.*, w.name as workout_name, w.description as workout_description
      FROM completed_workouts cw
      INNER JOIN workouts w ON cw.workout_id = w.id
      WHERE cw.user_id = ?
      ORDER BY cw.completed_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    
    try {
      return await db.selectAll(sql, [userId]);
    } catch (error) {
      console.error('❌ Error finding completed workouts by user ID:', error);
      throw error;
    }
  }

  /**
   * Get workout completion count for a user
   */
  static async getCountByUserId(userId) {
    const sql = `
      SELECT COUNT(*) as total_workouts
      FROM completed_workouts
      WHERE user_id = ?
    `;
    
    try {
      const result = await db.selectOne(sql, [userId]);
      return result ? result.total_workouts : 0;
    } catch (error) {
      console.error('❌ Error getting workout count:', error);
      throw error;
    }
  }

  /**
   * Get workout stats for a user (total workouts, total time, etc.)
   */
  static async getStatsByUserId(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total_workouts,
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_calories,
        AVG(rating) as average_rating
      FROM completed_workouts
      WHERE user_id = ?
    `;
    
    try {
      return await db.selectOne(sql, [userId]);
    } catch (error) {
      console.error('❌ Error getting workout stats:', error);
      throw error;
    }
  }

  /**
   * Delete a completed workout record
   */
  static async delete(id) {
    const sql = `DELETE FROM completed_workouts WHERE id = ?`;
    
    try {
      const rowsAffected = await db.update(sql, [id]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting completed workout:', error);
      throw error;
    }
  }
}

module.exports = CompletedWorkoutModel;
