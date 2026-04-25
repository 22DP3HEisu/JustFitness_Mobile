const express = require('express');
const { authenticateToken } = require('../lib/auth');
const ExerciseModel = require('../lib/DbModels/exerciseModel');
const router = express.Router();

/**
 * GET /api/exercises
 * Get all exercises
 */
router.get('/', async (req, res) => {
  try {
    const exercises = await ExerciseModel.findAll();
    
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
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

/**
 * POST /api/exercises
 * Create a new exercise
 * Required fields: name
 * Optional fields: description, primaryMuscleGroupId, secondaryMuscleGroupIds
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, primaryMuscleGroupId, secondaryMuscleGroupIds } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name is required'
      });
    }

    // Create exercise (no longer using difficulty)
    const exercise = await ExerciseModel.create(
      name.trim(),
      description || null,
      null // difficulty is no longer used
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
    const { name, description, difficulty } = req.body;

    // Check if exercise exists
    const exercise = await ExerciseModel.findById(id);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    // Update exercise
    const updated = await ExerciseModel.update(id, {
      name: name !== undefined ? name : exercise.name,
      description: description !== undefined ? description : exercise.description,
      difficulty: difficulty !== undefined ? difficulty : exercise.difficulty
    });

    if (updated) {
      const updatedExercise = await ExerciseModel.findById(id);
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
