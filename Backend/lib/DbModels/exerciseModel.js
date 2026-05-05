const { db } = require('../database');

/**
 * Vingrinājuma modelis datubāzes darbībām
 * Izseko vingrinājumus un to saistības ar muskuļu grupām
 * MySQL īstenojums
 */
class ExerciseModel {
  static tableName = 'exercises';

  /**
   * Izveido vingrinājumu un to muskuļu grupu saites tabulas
   */
  static async createTable() {
    // Izveido galveno vingrinājumu tabulu
    const createExercisesTableSQL = `
      CREATE TABLE IF NOT EXISTS exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(150) NOT NULL UNIQUE,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_exercises_name (name),
        INDEX idx_user_id (user_id),
        UNIQUE KEY unique_user_exercise (user_id, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Izveido saites tabulu starp vingrinājumiem un muskuļu grupām
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
   * Izveido jaunu vingrinājumu
   */
  static async create(userId, name, description = null, isPublic = false) {
    const sql = `
      INSERT INTO exercises (user_id, name, description, is_public)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [userId, name, description, isPublic];
    
    try {
      const result = await db.insert(sql, params);
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating exercise:', error);
      throw error;
    }
  }

  /**
   * Atrod vingrinājumu pēc ID ar muskuļu grupām
   */
  static async findById(id) {
    const sql = `
      SELECT e.id, e.user_id, e.name, e.description, e.is_public, e.created_at, e.updated_at
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
   * Atrod vingrinājumu pēc nosaukuma ar muskuļu grupām
   */
  static async findByName(name) {
    const sql = `
      SELECT e.id, e.user_id, e.name, e.description, e.is_public, e.created_at, e.updated_at
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
   * Iegūst visus vingrinājumus ar muskuļu grupām
   */
  static async findAll() {
    const sql = `
      SELECT e.id, e.user_id, e.name, e.description, e.is_public, e.created_at, e.updated_at
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
   * Atrod lietotāja vingrinājumus
   */
  static async findByUserId(userId) {
    const sql = `
      SELECT e.id, e.user_id, e.name, e.description, e.is_public, e.created_at, e.updated_at
      FROM exercises e
      WHERE e.user_id = ?
      ORDER BY e.name ASC
    `;
    
    try {
      const exercises = await db.selectAll(sql, [userId]);
      for (const exercise of exercises) {
        exercise.muscleGroups = await this.getMuscleGroups(exercise.id);
      }
      return exercises;
    } catch (error) {
      console.error('❌ Error finding exercises by user ID:', error);
      throw error;
    }
  }

  /**
   * Iegūst vingrinājumam piesaistītās muskuļu grupas
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
   * Pievieno muskuļu grupu vingrinājumam
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
   * Noņem muskuļu grupu no vingrinājuma
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
   * Atjaunina vingrinājumu
   */
  static async update(id, updates = {}) {
    const {
      name,
      description,
      isPublic,
    } = updates;

    const sql = `
      UPDATE exercises
      SET name = ?, description = ?, is_public = ?
      WHERE id = ?
    `;
    
    try {
      const rowsAffected = await db.update(sql, [name, description, isPublic ? 1 : 0, id]);
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
   * Dzēš vingrinājumu
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

  /**
   * Iegūst lietotāja redzamos vingrinājumus: savus un publiskos
   */
  static async findVisibleToUser(userId) {
    const sql = `
      SELECT e.id, e.user_id, e.name, e.description, e.is_public, e.created_at, e.updated_at
      FROM exercises e
      WHERE e.user_id = ? OR e.is_public = 1
      ORDER BY e.name ASC
    `;

    try {
      const exercises = await db.selectAll(sql, [userId]);
      for (const exercise of exercises) {
        exercise.muscleGroups = await this.getMuscleGroups(exercise.id);
      }
      return exercises;
    } catch (error) {
      console.error('❌ Error finding visible exercises:', error);
      throw error;
    }
  }

  static async replaceMuscleGroups(exerciseId, primaryMuscleGroupId = null, secondaryMuscleGroupIds = []) {
    await db.update('DELETE FROM exercise_muscle_groups WHERE exercise_id = ?', [exerciseId]);

    if (primaryMuscleGroupId) {
      await this.addMuscleGroup(exerciseId, primaryMuscleGroupId, true);
    }

    for (const muscleGroupId of secondaryMuscleGroupIds) {
      if (!muscleGroupId || Number(muscleGroupId) === Number(primaryMuscleGroupId)) {
        continue;
      }

      await this.addMuscleGroup(exerciseId, muscleGroupId, false);
    }

    return await this.findById(exerciseId);
  }

  static async getTopWeightHistory(exerciseId, userId, limit = 12) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 12, 50));
    const sql = `
      SELECT *
      FROM (
        SELECT
          wl.id AS workout_log_id,
          wl.workout_id,
          w.name AS workout_name,
          COALESCE(wl.completed_at, wl.started_at) AS session_date,
          MAX(sl.weight) AS top_weight,
          COUNT(sl.id) AS set_count
        FROM workout_logs wl
        JOIN workouts w ON w.id = wl.workout_id
        JOIN exercise_logs el ON el.workout_log_id = wl.id
        JOIN set_logs sl ON sl.exercise_log_id = el.id
        WHERE wl.user_id = ?
          AND el.exercise_id = ?
          AND wl.completed_at IS NOT NULL
          AND sl.weight IS NOT NULL
        GROUP BY wl.id, wl.workout_id, w.name, wl.started_at, wl.completed_at
        ORDER BY session_date DESC
        LIMIT ${safeLimit}
      ) recent_sessions
      ORDER BY session_date ASC
    `;

    return await db.selectAll(sql, [userId, exerciseId]);
  }
}

module.exports = ExerciseModel;
