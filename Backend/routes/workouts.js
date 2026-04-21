const express = require('express');
const { authenticateToken } = require('../lib/auth');
const WorkoutModel = require('../lib/workoutModel');
const CompletedWorkoutModel = require('../lib/completedWorkoutModel');
const router = express.Router();

/**
 * GET /api/workouts
 * Get all workouts for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const workouts = await WorkoutModel.findByUserId(userId);
    
    res.json({
      success: true,
      data: workouts
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workouts',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/:id
 * Get a specific workout by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const workout = await WorkoutModel.findById(id);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Check if workout belongs to the authenticated user
    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this workout'
      });
    }

    res.json({
      success: true,
      data: workout
    });
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts
 * Create a new workout
 * Required fields: name
 * Optional fields: description, workoutDate
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, workoutDate } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workout name is required'
      });
    }

    // Create workout
    const workout = await WorkoutModel.create(
      userId,
      name.trim(),
      description || null,
      workoutDate || null
    );

    res.status(201).json({
      success: true,
      message: 'Workout created successfully',
      data: workout
    });
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workout',
      error: error.message
    });
  }
});

/**
 * PUT /api/workouts/:id
 * Update a workout
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, description, duration, caloriesBurned } = req.body;

    // Check if workout exists
    const workout = await WorkoutModel.findById(id);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Check if workout belongs to the authenticated user
    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this workout'
      });
    }

    // Update workout
    const updated = await WorkoutModel.update(id, {
      name: name !== undefined ? name : workout.name,
      description: description !== undefined ? description : workout.description,
      duration: duration !== undefined ? duration : workout.duration,
      calories_burned: caloriesBurned !== undefined ? caloriesBurned : workout.calories_burned
    });

    if (updated) {
      const updatedWorkout = await WorkoutModel.findById(id);
      res.json({
        success: true,
        message: 'Workout updated successfully',
        data: updatedWorkout
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update workout'
      });
    }
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workout',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/:id
 * Delete a workout
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if workout exists
    const workout = await WorkoutModel.findById(id);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Check if workout belongs to the authenticated user
    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this workout'
      });
    }

    // Delete workout
    const deleted = await WorkoutModel.delete(id);
    if (deleted) {
      res.json({
        success: true,
        message: 'Workout deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete workout'
      });
    }
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete workout',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/:workoutId/exercises
 * Add a set for an exercise in a workout
 * Required fields: exerciseId, setNumber, reps
 * Optional fields: weight, weightUnit, duration, restDuration, notes
 */
router.post('/:workoutId/exercises', authenticateToken, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user.userId;
    const { exerciseId, setNumber, reps, weight, weightUnit, duration, restDuration, notes } = req.body;

    // Validate required fields
    if (!exerciseId || !setNumber || reps === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Exercise ID, setNumber, and reps are required'
      });
    }

    // Check if workout exists and belongs to user
    const workout = await WorkoutModel.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this workout'
      });
    }

    // Add exercise set to workout
    const workoutExercise = await WorkoutModel.addExercise(
      workoutId,
      exerciseId,
      setNumber,
      reps,
      weight || null,
      weightUnit || 'kg',
      duration || null,
      restDuration || null,
      notes || null
    );

    const updatedWorkout = await WorkoutModel.findById(workoutId);
    res.status(201).json({
      success: true,
      message: 'Exercise set added to workout successfully',
      data: updatedWorkout
    });
  } catch (error) {
    console.error('Error adding exercise to workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add exercise to workout',
      error: error.message
    });
  }
});

/**
 * PUT /api/workouts/:workoutId/exercises/:exerciseId
 * Update an exercise in a workout
 */
router.put('/:workoutId/exercises/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const userId = req.user.userId;
    const { sets, reps, weight, weightUnit, duration, restDuration, notes } = req.body;

    // Check if workout exists and belongs to user
    const workout = await WorkoutModel.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this workout'
      });
    }

    // Update exercise in workout
    const updated = await WorkoutModel.updateExercise(
      workoutId,
      exerciseId,
      sets,
      reps,
      weight,
      weightUnit,
      duration,
      restDuration,
      notes
    );

    if (updated) {
      const updatedWorkout = await WorkoutModel.findById(workoutId);
      res.json({
        success: true,
        message: 'Exercise updated in workout successfully',
        data: updatedWorkout
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Exercise not found in this workout'
      });
    }
  } catch (error) {
    console.error('Error updating exercise in workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exercise in workout',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/:workoutId/exercises/:exerciseId
 * Remove an exercise from a workout
 */
router.delete('/:workoutId/exercises/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const userId = req.user.userId;

    // Check if workout exists and belongs to user
    const workout = await WorkoutModel.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this workout'
      });
    }

    // Remove exercise from workout
    const removed = await WorkoutModel.removeExercise(workoutId, exerciseId);
    if (removed) {
      const updatedWorkout = await WorkoutModel.findById(workoutId);
      res.json({
        success: true,
        message: 'Exercise removed from workout successfully',
        data: updatedWorkout
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Exercise not found in this workout'
      });
    }
  } catch (error) {
    console.error('Error removing exercise from workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove exercise from workout',
      error: error.message
    });
  }
});

// ==================== COMPLETED WORKOUTS ROUTES ====================

/**
 * GET /api/workouts/completed/latest
 * Get the latest completed workouts for the authenticated user
 */
router.get('/completed/latest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    const completedWorkouts = await CompletedWorkoutModel.getLatestByUserId(userId, limit);
    
    res.json({
      success: true,
      data: completedWorkouts
    });
  } catch (error) {
    console.error('Error fetching latest completed workouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest completed workouts',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/completed/stats
 * Get workout statistics for the authenticated user
 */
router.get('/completed/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const stats = await CompletedWorkoutModel.getStatsByUserId(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching workout stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout stats',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/completed
 * Get all completed workouts for the authenticated user with pagination
 */
router.get('/completed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const completedWorkouts = await CompletedWorkoutModel.findByUserId(userId, limit, offset);
    const totalCount = await CompletedWorkoutModel.getCountByUserId(userId);
    
    res.json({
      success: true,
      data: completedWorkouts,
      pagination: {
        total: totalCount,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching completed workouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completed workouts',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/completed
 * Record a completed workout
 * Required fields: workoutId
 * Optional fields: durationMinutes, caloriesBurned, notes, rating
 */
router.post('/completed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { workoutId, durationMinutes, caloriesBurned, notes, rating } = req.body;

    // Validate required fields
    if (!workoutId) {
      return res.status(400).json({
        success: false,
        message: 'Workout ID is required'
      });
    }

    // Verify the workout exists
    const workout = await WorkoutModel.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Record the completed workout
    const completedWorkout = await CompletedWorkoutModel.create(
      userId,
      workoutId,
      durationMinutes || null,
      caloriesBurned || null,
      notes || null,
      rating || null
    );

    res.status(201).json({
      success: true,
      message: 'Workout completion recorded successfully',
      data: completedWorkout
    });
  } catch (error) {
    console.error('Error recording completed workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record completed workout',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/completed/:id
 * Delete a completed workout record
 */
router.delete('/completed/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify the completed workout exists and belongs to the user
    const completedWorkout = await CompletedWorkoutModel.findById(id);
    if (!completedWorkout) {
      return res.status(404).json({
        success: false,
        message: 'Completed workout record not found'
      });
    }

    if (completedWorkout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this record'
      });
    }

    const deleted = await CompletedWorkoutModel.delete(id);
    if (deleted) {
      res.json({
        success: true,
        message: 'Completed workout record deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete completed workout record'
      });
    }
  } catch (error) {
    console.error('Error deleting completed workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete completed workout record',
      error: error.message
    });
  }
});

module.exports = router;
