const express = require('express');
const { authenticateToken } = require('../lib/auth');
const WorkoutModel = require('../lib/DbModels/workoutModel');
const WorkoutExerciseModel = require('../lib/DbModels/workoutExerciseModel');
const workoutLogModel = require('../lib/DbModels/workoutLogModel');
const ExerciseLogModel = require('../lib/DbModels/exerciseLogModel');
const SetLogModel = require('../lib/DbModels/SetLogModel');
const ExerciseModel = require('../lib/DbModels/exerciseModel');
const router = express.Router();

const ownsSession = (session, userId) => Number(session?.user_id) === Number(userId);
const parseLogInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseLogFloat = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildWorkoutSessionPayload = async (session) => {
  const workoutDetails = await WorkoutModel.findById(session.workout_id);
  const exerciseLogs = await ExerciseLogModel.findByWorkoutLogId(session.id);

  for (const exerciseLog of exerciseLogs) {
    exerciseLog.sets = await SetLogModel.findByExerciseLogId(exerciseLog.id);
  }

  return {
    ...session,
    workout: workoutDetails,
    exerciseLogs
  };
};

const findOwnedExerciseLog = async (exerciseLogId, userId) => {
  const exerciseLog = await ExerciseLogModel.findById(exerciseLogId);
  if (!exerciseLog) {
    return { status: 404, message: 'Session exercise not found' };
  }

  const session = await workoutLogModel.findById(exerciseLog.workout_log_id);
  if (!ownsSession(session, userId)) {
    return { status: 403, message: 'You do not have permission to edit this session exercise' };
  }

  return { exerciseLog, session };
};

const findOwnedSetLog = async (setLogId, userId) => {
  const setLog = await SetLogModel.findById(setLogId);
  if (!setLog) {
    return { status: 404, message: 'Session set not found' };
  }

  const ownedExerciseLog = await findOwnedExerciseLog(setLog.exercise_log_id, userId);
  if (ownedExerciseLog.status) {
    return ownedExerciseLog;
  }

  return { setLog, exerciseLog: ownedExerciseLog.exerciseLog, session: ownedExerciseLog.session };
};

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
 * GET /api/workouts/:id/details
 * Get workout details with recent completed session volume
 */
router.get('/:id/details', authenticateToken, async (req, res) => {
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

    if (Number(workout.user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this workout'
      });
    }

    const recentSessions = await workoutLogModel.findCompletedByWorkoutId(userId, id, 8);

    res.json({
      success: true,
      data: {
        workout,
        recentSessions: recentSessions.reverse()
      }
    });
  } catch (error) {
    console.error('Error fetching workout details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout details',
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
    const { name, description, exercises } = req.body;

    // Pārbaudām vai treniņa nosaukums ir ievadīts
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workout name is required'
      });
    }

    // Izveidojam treniņu
    const workout = await WorkoutModel.create(
      userId,
      name.trim(),
      description || null
    );

    // Ja vingrinājumi ir padoti, pievienojam tos vienā reizē
    if (exercises?.length > 0) {
      await WorkoutExerciseModel.addMultiple(workout.id, exercises);
    }

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
    const { name, description, exercises } = req.body;

    // Pārbaudām vai treniņš eksistē
    const workout = await WorkoutModel.findById(id);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Pārbaudām vai treniņš pieder autentificētajam lietotājam
    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this workout'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Workout name is required'
      });
    }

    // Atjauninām treniņa pamata informāciju
    await WorkoutModel.update(
      id,
      name.trim(),
      description || null
    );

    await WorkoutExerciseModel.deleteByWorkoutId(id);

    if (exercises?.length) {
      await WorkoutExerciseModel.addMultiple(id, exercises);
    }

    const updatedWorkout = await WorkoutModel.findById(id);
    res.json({
      success: true,
      message: 'Workout updated successfully',
      data: updatedWorkout
    });
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
    const workoutExercise = await WorkoutExerciseModel.add(
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
    const updated = await WorkoutExerciseModel.update(
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
 * DELETE /api/workouts/:workoutId/exercises/set/:setId
 * Remove a specific set from a workout exercise (MUST COME BEFORE /:exerciseId route)
 */
router.delete('/:workoutId/exercises/set/:setId', authenticateToken, async (req, res) => {
  try {
    const { workoutId, setId } = req.params;
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

    // Remove exercise set from workout
    const removed = await WorkoutExerciseModel.remove(setId);
    if (removed) {
      res.json({
        success: true,
        message: 'Exercise set removed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Exercise set not found'
      });
    }
  } catch (error) {
    console.error('Error removing exercise set from workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove exercise set',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/:workoutId/exercises/:exerciseId
 * Remove all sets of an exercise from a workout
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

    // Get all sets for this exercise and remove them
    const exerciseData = workout.exercises.find(ex => ex.exercise_id === parseInt(exerciseId));
    if (!exerciseData) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found in this workout'
      });
    }

    // Delete all sets for this exercise
    for (const set of exerciseData.sets) {
      await WorkoutExerciseModel.remove(set.id);
    }

    const updatedWorkout = await WorkoutModel.findById(workoutId);
    res.json({
      success: true,
      message: 'Exercise removed from workout successfully',
      data: updatedWorkout
    });
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

// ==================== WORKOUT SESSION ROUTES ====================

/**
 * POST /api/workouts/:id/start
 * Start a new workout session
 */
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Pārbaudām vai treniņš eksistē
    const workout = await WorkoutModel.findById(id);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }

    // Pārbaudām vai treniņš pieder autentificētajam lietotājam
    if (workout.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to start this workout'
      });
    }

    // Sākam treniņu sesiju
    const workoutLog = await workoutLogModel.start(userId, id);

    for (const exercise of workout.exercises || []) {
      const exerciseLogId = await ExerciseLogModel.add(workoutLog.id, exercise.exercise_id);

      for (const set of exercise.sets || []) {
        await SetLogModel.add(
          exerciseLogId,
          set.set_number,
          set.reps,
          set.weight
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Workout started successfully',
      data: workoutLog
    });
  } catch (error) {
    console.error('Error starting workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start workout',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/session/ongoing
 * Get the current ongoing workout for the authenticated user
 */
router.get('/session/ongoing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Meklējam tekošo treniņu (bez completed_at)
    const ongoingWorkout = await workoutLogModel.getOngoing(userId);

    if (!ongoingWorkout) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Iegūstam treniņa detaļas
    const sessionPayload = await buildWorkoutSessionPayload(ongoingWorkout);

    res.json({
      success: true,
      data: sessionPayload
    });
  } catch (error) {
    console.error('Error fetching ongoing workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ongoing workout',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/session/:sessionId
 * Get an editable workout session with exercise and set logs
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await workoutLogModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    if (!ownsSession(session, userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this session'
      });
    }

    res.json({
      success: true,
      data: await buildWorkoutSessionPayload(session)
    });
  } catch (error) {
    console.error('Error fetching workout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout session',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/session/:sessionId/exercises
 * Add an exercise to an active workout session
 */
router.post('/session/:sessionId/exercises', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { exerciseId, notes = null, sets = [] } = req.body;

    if (!exerciseId) {
      return res.status(400).json({
        success: false,
        message: 'Exercise ID is required'
      });
    }

    const session = await workoutLogModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    if (!ownsSession(session, userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this session'
      });
    }

    if (session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    const exercise = await ExerciseModel.findById(exerciseId);
    if (!exercise || (Number(exercise.user_id) !== Number(userId) && !exercise.is_public)) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const exerciseLogId = await ExerciseLogModel.add(sessionId, exerciseId, notes);
    const setsToCreate = sets.length ? sets : [{ reps: 10, weight: null, restDuration: null }];

    for (let index = 0; index < setsToCreate.length; index += 1) {
      const set = setsToCreate[index];
      await SetLogModel.add(
        exerciseLogId,
        set.setNumber || set.set_number || index + 1,
        parseLogInt(set.reps),
        parseLogFloat(set.weight)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Exercise added to session',
      data: await buildWorkoutSessionPayload(session)
    });
  } catch (error) {
    console.error('Error adding session exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add exercise to session',
      error: error.message
    });
  }
});

/**
 * PUT /api/workouts/session/exercises/:exerciseLogId
 * Update notes for a session exercise
 */
router.put('/session/exercises/:exerciseLogId', authenticateToken, async (req, res) => {
  try {
    const { exerciseLogId } = req.params;
    const userId = req.user.userId;
    const { notes = null } = req.body;

    const ownedExerciseLog = await findOwnedExerciseLog(exerciseLogId, userId);
    if (ownedExerciseLog.status) {
      return res.status(ownedExerciseLog.status).json({
        success: false,
        message: ownedExerciseLog.message
      });
    }

    if (ownedExerciseLog.session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    await ExerciseLogModel.update(exerciseLogId, notes);

    res.json({
      success: true,
      message: 'Session exercise updated',
      data: await buildWorkoutSessionPayload(ownedExerciseLog.session)
    });
  } catch (error) {
    console.error('Error updating session exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session exercise',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/session/exercises/:exerciseLogId
 * Remove an exercise and its sets from a session
 */
router.delete('/session/exercises/:exerciseLogId', authenticateToken, async (req, res) => {
  try {
    const { exerciseLogId } = req.params;
    const userId = req.user.userId;

    const ownedExerciseLog = await findOwnedExerciseLog(exerciseLogId, userId);
    if (ownedExerciseLog.status) {
      return res.status(ownedExerciseLog.status).json({
        success: false,
        message: ownedExerciseLog.message
      });
    }

    if (ownedExerciseLog.session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    await ExerciseLogModel.delete(exerciseLogId);

    res.json({
      success: true,
      message: 'Session exercise removed',
      data: await buildWorkoutSessionPayload(ownedExerciseLog.session)
    });
  } catch (error) {
    console.error('Error removing session exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove session exercise',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/session/exercises/:exerciseLogId/sets
 * Add a set to a session exercise
 */
router.post('/session/exercises/:exerciseLogId/sets', authenticateToken, async (req, res) => {
  try {
    const { exerciseLogId } = req.params;
    const userId = req.user.userId;
    const { reps = 10, weight = null, restDuration = null } = req.body;

    const ownedExerciseLog = await findOwnedExerciseLog(exerciseLogId, userId);
    if (ownedExerciseLog.status) {
      return res.status(ownedExerciseLog.status).json({
        success: false,
        message: ownedExerciseLog.message
      });
    }

    if (ownedExerciseLog.session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    const nextSetNumber = await SetLogModel.getNextSetNumber(exerciseLogId);
    await SetLogModel.add(
      exerciseLogId,
      nextSetNumber,
      parseLogInt(reps, 10),
      parseLogFloat(weight),
      restDuration !== undefined && restDuration !== null && restDuration !== '' ? parseLogInt(restDuration, null) : null
    );

    res.status(201).json({
      success: true,
      message: 'Set added to session exercise',
      data: await buildWorkoutSessionPayload(ownedExerciseLog.session)
    });
  } catch (error) {
    console.error('Error adding session set:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add session set',
      error: error.message
    });
  }
});

/**
 * PUT /api/workouts/session/sets/:setLogId
 * Update a session set
 */
router.put('/session/sets/:setLogId', authenticateToken, async (req, res) => {
  try {
    const { setLogId } = req.params;
    const userId = req.user.userId;
    const { reps = 0, weight = null, restDuration = null } = req.body;

    const ownedSetLog = await findOwnedSetLog(setLogId, userId);
    if (ownedSetLog.status) {
      return res.status(ownedSetLog.status).json({
        success: false,
        message: ownedSetLog.message
      });
    }

    if (ownedSetLog.session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    await SetLogModel.update(
      setLogId,
      parseLogInt(reps),
      parseLogFloat(weight),
      restDuration !== undefined && restDuration !== null && restDuration !== '' ? parseLogInt(restDuration, null) : null
    );

    res.json({
      success: true,
      message: 'Session set updated',
      data: await buildWorkoutSessionPayload(ownedSetLog.session)
    });
  } catch (error) {
    console.error('Error updating session set:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session set',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/session/sets/:setLogId
 * Remove a set from a session exercise
 */
router.delete('/session/sets/:setLogId', authenticateToken, async (req, res) => {
  try {
    const { setLogId } = req.params;
    const userId = req.user.userId;

    const ownedSetLog = await findOwnedSetLog(setLogId, userId);
    if (ownedSetLog.status) {
      return res.status(ownedSetLog.status).json({
        success: false,
        message: ownedSetLog.message
      });
    }

    if (ownedSetLog.session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Completed sessions cannot be edited'
      });
    }

    await SetLogModel.delete(setLogId);

    res.json({
      success: true,
      message: 'Session set removed',
      data: await buildWorkoutSessionPayload(ownedSetLog.session)
    });
  } catch (error) {
    console.error('Error removing session set:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove session set',
      error: error.message
    });
  }
});

/**
 * POST /api/workouts/session/:sessionId/complete
 * Complete a workout session
 */
router.post('/session/:sessionId/complete', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { exercises } = req.body;

    // Pārbaudām vai sesija pieder autentificētajam lietotājam
    const session = await workoutLogModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    if (!ownsSession(session, userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to complete this session'
      });
    }

    // Pabeigzam treniņu sesiju
    if (session.completed_at) {
      return res.status(400).json({
        success: false,
        message: 'Workout session is already completed'
      });
    }

    if (exercises !== undefined && !Array.isArray(exercises)) {
      return res.status(400).json({
        success: false,
        message: 'Exercises must be an array'
      });
    }

    if (Array.isArray(exercises)) {
      for (const exercise of exercises) {
        if (!exercise.exerciseId) {
          return res.status(400).json({
            success: false,
            message: 'Each exercise log needs an exerciseId'
          });
        }

        const exerciseRecord = await ExerciseModel.findById(exercise.exerciseId);
        if (!exerciseRecord || (Number(exerciseRecord.user_id) !== Number(userId) && !exerciseRecord.is_public)) {
          return res.status(404).json({
            success: false,
            message: 'Exercise not found'
          });
        }
      }

      await ExerciseLogModel.deleteByWorkoutLogId(sessionId);

      for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
        const exercise = exercises[exerciseIndex];
        const exerciseLogId = await ExerciseLogModel.add(
          sessionId,
          exercise.exerciseId,
          exercise.notes ?? null
        );

        const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
        for (let setIndex = 0; setIndex < sets.length; setIndex += 1) {
          const set = sets[setIndex];

          await SetLogModel.add(
            exerciseLogId,
            set.setNumber || set.set_number || setIndex + 1,
            parseLogInt(set.reps),
            parseLogFloat(set.weight),
            set.restDuration !== undefined && set.restDuration !== null && set.restDuration !== ''
              ? parseLogInt(set.restDuration, null)
              : null
          );
        }
      }
    }

    const completed = await workoutLogModel.complete(sessionId);

    if (completed) {
      const updatedSession = await workoutLogModel.findById(sessionId);
      res.json({
        success: true,
        message: 'Workout completed successfully',
        data: await buildWorkoutSessionPayload(updatedSession)
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to complete workout'
      });
    }
  } catch (error) {
    console.error('Error completing workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete workout',
      error: error.message
    });
  }
});

/**
 * DELETE /api/workouts/session/:sessionId
 * Cancel/delete a workout session
 */
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Pārbaudām vai sesija pieder autentificētajam lietotājam
    const session = await workoutLogModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this session'
      });
    }

    // Dzēšam treniņu sesiju
    const deleted = await workoutLogModel.delete(sessionId);

    if (deleted) {
      res.json({
        success: true,
        message: 'Workout session cancelled successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel workout session'
      });
    }
  } catch (error) {
    console.error('Error cancelling workout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel workout',
      error: error.message
    });
  }
});

module.exports = router;
