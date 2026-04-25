const { db } = require('../database');

/**
 * Exercise model for database operations
 * MySQL implementation
 */
class ExerciseModel {
  
  /**
   * Create exercises table
   */
  static async createTable() {
    const createExercisesTableSQL = `
      CREATE TABLE IF NOT EXISTS exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        description TEXT,
        difficulty VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_exercises_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    const createLinkTableSQL = `
      CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exercise_id INT NOT NULL,
        muscle_group_id INT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
        UNIQUE KEY unique_exercise_muscle_group (exercise_id, muscle_group_id),
        INDEX idx_exercise_id (exercise_id),
        INDEX idx_muscle_group_id (muscle_group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    try {
      await db.executeQuery(createExercisesTableSQL);
      console.log('✅ Exercises table created successfully');
      await db.executeQuery(createLinkTableSQL);
      console.log('✅ Exercise-Muscle Groups link table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating exercises tables:', error);
      throw error;
    }
  }

  /**
   * Create a new exercise
   */
  static async create(name, description = null, difficulty = 'Intermediate') {
    const sql = `
      INSERT INTO exercises (name, description, difficulty)
      VALUES (?, ?, ?)
    `;
    
    const params = [name, description, difficulty];
    
    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating exercise:', error);
      throw error;
    }
  }

  /**
   * Find exercise by ID with muscle groups
   */
  static async findById(id) {
    const sql = `
      SELECT e.id, e.name, e.description, e.difficulty, e.created_at, e.updated_at
      FROM exercises e
      WHERE e.id = ?
    `;
    
    try {
      const exercise = await db.selectOne(sql, [id]);
      if (exercise) {
        exercise.muscleGroups = await this.getMuscleGroups(id);
      }
      return exercise;
    } catch (error) {
      console.error('❌ Error finding exercise by ID:', error);
      throw error;
    }
  }

  /**
   * Find exercise by name with muscle groups
   */
  static async findByName(name) {
    const sql = `
      SELECT e.id, e.name, e.description, e.difficulty, e.created_at, e.updated_at
      FROM exercises e
      WHERE e.name = ?
    `;
    
    try {
      const exercise = await db.selectOne(sql, [name]);
      if (exercise) {
        exercise.muscleGroups = await this.getMuscleGroups(exercise.id);
      }
      return exercise;
    } catch (error) {
      console.error('❌ Error finding exercise by name:', error);
      throw error;
    }
  }

  /**
   * Get all exercises with muscle groups
   */
  static async findAll() {
    const sql = `
      SELECT e.id, e.name, e.description, e.difficulty, e.created_at, e.updated_at
      FROM exercises e
      ORDER BY e.name ASC
    `;
    
    try {
      const exercises = await db.selectAll(sql);
      for (const exercise of exercises) {
        exercise.muscleGroups = await this.getMuscleGroups(exercise.id);
      }
      return exercises;
    } catch (error) {
      console.error('❌ Error finding all exercises:', error);
      throw error;
    }
  }

  /**
   * Get muscle groups for an exercise
   */
  static async getMuscleGroups(exerciseId) {
    const sql = `
      SELECT mg.id, mg.name, mg.description, emg.is_primary
      FROM muscle_groups mg
      INNER JOIN exercise_muscle_groups emg ON mg.id = emg.muscle_group_id
      WHERE emg.exercise_id = ?
      ORDER BY emg.is_primary DESC, mg.name ASC
    `;
    
    try {
      return await db.selectAll(sql, [exerciseId]);
    } catch (error) {
      console.error('❌ Error getting muscle groups for exercise:', error);
      throw error;
    }
  }

  /**
   * Add muscle group to exercise
   */
  static async addMuscleGroup(exerciseId, muscleGroupId, isPrimary = false) {
    const sql = `
      INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
      VALUES (?, ?, ?)
    `;
    
    try {
      const result = await db.insert(sql, [exerciseId, muscleGroupId, isPrimary ? 1 : 0]);
      return result.insertId;
    } catch (error) {
      console.error('❌ Error adding muscle group to exercise:', error);
      throw error;
    }
  }

  /**
   * Remove muscle group from exercise
   */
  static async removeMuscleGroup(exerciseId, muscleGroupId) {
    const sql = `
      DELETE FROM exercise_muscle_groups
      WHERE exercise_id = ? AND muscle_group_id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [exerciseId, muscleGroupId]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error removing muscle group from exercise:', error);
      throw error;
    }
  }

  /**
   * Update exercise
   */
  static async update(id, name, description, difficulty) {
    const sql = `
      UPDATE exercises
      SET name = ?, description = ?, difficulty = ?
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [name, description, difficulty, id]);
      if (rowsAffected > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating exercise:', error);
      throw error;
    }
  }

  /**
   * Delete exercise
   */
  static async delete(id) {
    const sql = `DELETE FROM exercises WHERE id = ?`;
    
    try {
      const rowsAffected = await db.update(sql, [id]);
      return rowsAffected > 0;
    } catch (error) {
      console.error('❌ Error deleting exercise:', error);
      throw error;
    }
  }
}

module.exports = ExerciseModel;
