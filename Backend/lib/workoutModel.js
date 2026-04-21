const { db } = require('./database');

/**
 * Workout model for database operations
 * MySQL implementation
 */
class WorkoutModel {
  
  /**
   * Create workouts table and workout_exercises link table
   */
  static async createTable() {
    const createWorkoutsTableSQL = `
      CREATE TABLE IF NOT EXISTS workouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        duration INT,
        calories_burned INT,
        workout_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_workout_date (workout_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    const createLinkTableSQL = `
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workout_id INT NOT NULL,
        exercise_id INT NOT NULL,
        set_number INT NOT NULL DEFAULT 1,
        reps INT NOT NULL,
        weight DECIMAL(6,2),
        weight_unit VARCHAR(10) DEFAULT 'kg',
        duration INT,
        rest_duration INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
        INDEX idx_workout_id (workout_id),
        INDEX idx_exercise_id (exercise_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    try {
      await db.executeQuery(createWorkoutsTableSQL);
      console.log('✅ Workouts table created successfully');
      await db.executeQuery(createLinkTableSQL);
      console.log('✅ Workout-Exercises link table created successfully');
      
      // Migration: Check if set_number column exists and add if not
      try {
        const checkColumnSQL = `
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'workout_exercises' 
          AND COLUMN_NAME = 'set_number'
        `;
        const columnExists = await db.selectOne(checkColumnSQL);
        
        if (!columnExists) {
          const addSetNumberSQL = `ALTER TABLE workout_exercises ADD COLUMN set_number INT NOT NULL DEFAULT 1 AFTER exercise_id`;
          await db.executeQuery(addSetNumberSQL);
          console.log('✅ set_number column added');
          
          // Drop old 'sets' column if it exists
          const checkSetsColumnSQL = `
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'workout_exercises' 
            AND COLUMN_NAME = 'sets'
          `;
          const setsColumnExists = await db.selectOne(checkSetsColumnSQL);
          if (setsColumnExists) {
            await db.executeQuery(`ALTER TABLE workout_exercises DROP COLUMN sets`);
            console.log('✅ Old sets column removed');
          }
        }
      } catch (e) {
        console.log('Migration check skipped:', e.message);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error creating workouts tables:', error);
      throw error;
    }
  }

  /**
   * Create a new workout
   */
  static async create(userId, name, description = null, workoutDate = null) {
    const date = workoutDate || new Date().toISOString().split('T')[0];
    const sql = `
      INSERT INTO workouts (user_id, name, description, workout_date)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [userId, name, description, date];
    
    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating workout:', error);
      throw error;
    }
  }

  /**
   * Find workout by ID with exercises
   */
  static async findById(id) {
    const sql = `
      SELECT w.id, w.user_id, w.name, w.description, w.duration, w.calories_burned, w.workout_date, w.created_at, w.updated_at
      FROM workouts w
      WHERE w.id = ?
    `;
    
    try {
      const workout = await db.selectOne(sql, [id]);
      if (workout) {
        workout.exercises = await this.getExercises(id);
      }
      return workout;
    } catch (error) {
      console.error('❌ Error finding workout by ID:', error);
      throw error;
    }
  }

  /**
   * Get all workouts for a user
   */
  static async findByUserId(userId, limit = 50, offset = 0) {
    const sql = `
      SELECT w.id, w.user_id, w.name, w.description, w.duration, w.calories_burned, w.workout_date, w.created_at, w.updated_at
      FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.workout_date DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    
    try {
      const workouts = await db.selectAll(sql, [userId]);
      for (const workout of workouts) {
        workout.exercises = await this.getExercises(workout.id);
      }
      return workouts;
    } catch (error) {
      console.error('❌ Error finding workouts by user ID:', error);
      throw error;
    }
  }

  /**
   * Get exercises for a workout (grouped by exercise with sets array)
   */
  static async getExercises(workoutId) {
    const sql = `
      SELECT we.id, we.exercise_id, we.set_number, we.reps, we.weight, we.weight_unit, we.duration, we.rest_duration, we.notes,
             e.name as exercise_name, e.description as exercise_description, e.difficulty
      FROM workout_exercises we
      INNER JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
      ORDER BY we.exercise_id ASC, we.set_number ASC
    `;
    
    try {
      const rows = await db.selectAll(sql, [workoutId]);
      
      // Group sets by exercise
      const exerciseMap = new Map();
      for (const row of rows) {
        const exerciseId = row.exercise_id;
        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            exercise_id: exerciseId,
            exercise_name: row.exercise_name,
            exercise_description: row.exercise_description,
            difficulty: row.difficulty,
            sets: []
          });
        }
        exerciseMap.get(exerciseId).sets.push({
          id: row.id,
          set_number: row.set_number,
          reps: row.reps,
          weight: row.weight,
          weight_unit: row.weight_unit,
          duration: row.duration,
          rest_duration: row.rest_duration,
          notes: row.notes
        });
      }
      
      return Array.from(exerciseMap.values());
    } catch (error) {
      console.error('❌ Error getting exercises for workout:', error);
      throw error;
    }
  }

  /**
   * Add a set for an exercise in a workout
   */
  static async addExercise(workoutId, exerciseId, setNumber, reps, weight = null, weightUnit = 'kg', duration = null, restDuration = null, notes = null) {
    const sql = `
      INSERT INTO workout_exercises (workout_id, exercise_id, set_number, reps, weight, weight_unit, duration, rest_duration, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await db.insert(sql, [workoutId, exerciseId, setNumber, reps, weight, weightUnit, duration, restDuration, notes]);
      return result.insertId;
    } catch (error) {
      console.error('❌ Error adding exercise to workout:', error);
      throw error;
    }
  }

  /**
   * Update a set in workout
   */
  static async updateExercise(workoutExerciseId, reps, weight, weightUnit, duration, restDuration, notes) {
    const sql = `
      UPDATE workout_exercises
      SET reps = ?, weight = ?, weight_unit = ?, duration = ?, rest_duration = ?, notes = ?
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [reps, weight, weightUnit, duration, restDuration, notes, workoutExerciseId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error updating exercise in workout:', error);
      throw error;
    }
  }

  /**
   * Remove exercise from workout
   */
  static async removeExercise(workoutExerciseId) {
    const sql = `DELETE FROM workout_exercises WHERE id = ?`;
    
    try {
      const rowsAffected = await db.update(sql, [workoutExerciseId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error removing exercise from workout:', error);
      throw error;
    }
  }

  /**
   * Update workout
   */
  static async update(id, name, description, duration, caloriesBurned) {
    const sql = `
      UPDATE workouts
      SET name = ?, description = ?, duration = ?, calories_burned = ?
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [name, description, duration, caloriesBurned, id]);
      if (rowsAffected > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating workout:', error);
      throw error;
    }
  }

  /**
   * Delete workout
   */
  static async delete(id) {
    const sql = `DELETE FROM workouts WHERE id = ?`;
    
    try {
      const rowsAffected = await db.update(sql, [id]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting workout:', error);
      throw error;
    }
  }
}

module.exports = WorkoutModel;
