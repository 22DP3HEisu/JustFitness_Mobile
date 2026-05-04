const express = require('express');
const { authenticateToken } = require('../lib/auth');
const ExerciseModel = require('../lib/DbModels/exerciseModel');
const UserModel = require('../lib/DbModels/userModel');
const router = express.Router();

const isAdminRequest = async (req) => {
  const user = await UserModel.findById(req.user.userId);
  return user?.role === 'admin';
};

/**
 * GET /api/exercises
 * Get all exercises
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const exercises = await ExerciseModel.findVisibleToUser(req.user.userId);
    
    res.json({
      success: true,
      data: exercises
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercises',
      error: error.message
    });
  }
});

/**
 * GET /api/exercises/:id
 * Get a specific exercise by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(exercise.user_id) !== Number(req.user.userId) && !exercise.is_public) {
      return res.status(403).json({
        success: false,
        message: 'You can only view public exercises or exercises you created'
      });
    }

    res.json({
      success: true,
      data: exercise
    });
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercise',
      error: error.message
    });
  }
});

router.get('/:id/weight-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const limit = req.query.limit || 12;

    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(exercise.user_id) !== Number(userId) && !exercise.is_public) {
      return res.status(403).json({
        success: false,
        message: 'You can only view public exercises or exercises you created'
      });
    }

    const history = await ExerciseModel.getTopWeightHistory(id, userId, limit);
    res.json({
      success: true,
      data: history.map((entry) => ({
        workoutLogId: entry.workout_log_id,
        workoutId: entry.workout_id,
        workoutName: entry.workout_name,
        date: entry.session_date,
        topWeight: entry.top_weight == null ? null : Number(entry.top_weight),
        setCount: entry.set_count,
      }))
    });
  } catch (error) {
    console.error('Error fetching exercise weight history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercise weight history',
      error: error.message
    });
  }
});

/**
 * POST /api/exercises
 * Create a new exercise
 * Required fields: name
 * Optional fields: description, primaryMuscleGroupId, secondaryMuscleGroupIds
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, primaryMuscleGroupId, secondaryMuscleGroupIds, isPublic } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name is required'
      });
    }

    // Izveido vingrinājumu ar lietotāja ID
    const exercise = await ExerciseModel.create(
      req.user.userId,
      name.trim(),
      description || null,
      isPublic === true
    );

    // Link primary muscle group if provided
    if (primaryMuscleGroupId) {
      try {
        await ExerciseModel.addMuscleGroup(exercise.id, primaryMuscleGroupId, true);
      } catch (linkError) {
        console.warn(`Could not link exercise to primary muscle group ${primaryMuscleGroupId}:`, linkError.message);
      }
    }

    // Link secondary muscle groups if provided
    if (secondaryMuscleGroupIds && Array.isArray(secondaryMuscleGroupIds) && secondaryMuscleGroupIds.length > 0) {
      for (const muscleGroupId of secondaryMuscleGroupIds) {
        // Skip if same as primary
        if (muscleGroupId === primaryMuscleGroupId) continue;
        try {
          await ExerciseModel.addMuscleGroup(exercise.id, muscleGroupId, false);
        } catch (linkError) {
          console.warn(`Could not link exercise to secondary muscle group ${muscleGroupId}:`, linkError.message);
        }
      }
    }

    // Refresh exercise to get updated muscle groups
    const updatedExercise = await ExerciseModel.findById(exercise.id);
    return res.status(201).json({
      success: true,
      message: 'Exercise created successfully',
      data: updatedExercise
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    
    // Handle duplicate name error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Exercise with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create exercise',
      error: error.message
    });
  }
});

/**
 * PUT /api/exercises/:id
 * Update an exercise
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, primaryMuscleGroupId, secondaryMuscleGroupIds, isPublic } = req.body;

    // Check if exercise exists
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(exercise.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit exercises you created'
      });
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name is required'
      });
    }

    // Update exercise
    const updated = await ExerciseModel.update(id, {
      name: name !== undefined ? name.trim() : exercise.name,
      description: description !== undefined ? description : exercise.description,
      isPublic: isPublic !== undefined ? isPublic === true : exercise.is_public
    });

    if (updated) {
      const shouldUpdateMuscleGroups = primaryMuscleGroupId !== undefined || secondaryMuscleGroupIds !== undefined;
      const updatedExercise = shouldUpdateMuscleGroups
        ? await ExerciseModel.replaceMuscleGroups(
            id,
            primaryMuscleGroupId || null,
            Array.isArray(secondaryMuscleGroupIds) ? secondaryMuscleGroupIds : []
          )
        : await ExerciseModel.findById(id);
      res.json({
        success: true,
        message: 'Exercise updated successfully',
        data: updatedExercise
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update exercise'
      });
    }
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exercise',
      error: error.message
    });
  }
});

/**
 * DELETE /api/exercises/:id
 * Delete an exercise
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exercise exists
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(exercise.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete exercises you created'
      });
    }

    // Delete exercise
    const deleted = await ExerciseModel.delete(id);
    if (deleted) {
      res.json({
        success: true,
        message: 'Exercise deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete exercise'
      });
    }
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exercise',
      error: error.message
    });
  }
});

/**
 * POST /api/exercises/:id/muscle-groups/:muscleGroupId
 * Add a muscle group to an exercise
 */
router.post('/:id/muscle-groups/:muscleGroupId', authenticateToken, async (req, res) => {
  try {
    const { id, muscleGroupId } = req.params;

    // Check if exercise exists
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    if (Number(exercise.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit exercises you created'
      });
    }

    // Add muscle group
    await ExerciseModel.addMuscleGroup(id, muscleGroupId);

    const updatedExercise = await ExerciseModel.findById(id);
    res.json({
      success: true,
      message: 'Muscle group added to exercise',
      data: updatedExercise
    });
  } catch (error) {
    console.error('Error adding muscle group to exercise:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This exercise is already linked to this muscle group'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add muscle group',
      error: error.message
    });
  }
});

/**
 * DELETE /api/exercises/:id/muscle-groups/:muscleGroupId
 * Remove a muscle group from an exercise
 */
router.delete('/:id/muscle-groups/:muscleGroupId', authenticateToken, async (req, res) => {
  try {
    const { id, muscleGroupId } = req.params;

    // Check if exercise exists
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    if (Number(exercise.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit exercises you created'
      });
    }

    // Remove muscle group
    const removed = await ExerciseModel.removeMuscleGroup(id, muscleGroupId);
    if (removed) {
      const updatedExercise = await ExerciseModel.findById(id);
      res.json({
        success: true,
        message: 'Muscle group removed from exercise',
        data: updatedExercise
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Link between exercise and muscle group not found'
      });
    }
  } catch (error) {
    console.error('Error removing muscle group from exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove muscle group',
      error: error.message
    });
  }
});

module.exports = router;
