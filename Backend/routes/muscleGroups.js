const express = require('express');
const { authenticateToken } = require('../lib/auth');
const MuscleGroupModel = require('../lib/DbModels/muscleGroupModel');
const router = express.Router();

/**
 * GET /api/muscle-groups
 * Iegūst visas muskuļu grupas.
 */
router.get('/', async (req, res) => {
  try {
    const muscleGroups = await MuscleGroupModel.findAll();
    
    res.json({
      success: true,
      data: muscleGroups
    });
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch muscle groups',
      error: error.message
    });
  }
});

/**
 * GET /api/muscle-groups/:id
 * Iegūst konkrētu muskuļu grupu pēc identifikatora.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const muscleGroup = await MuscleGroupModel.findById(id);
    if (!muscleGroup) {
      return res.status(404).json({
        success: false,
        message: 'Muscle group not found'
      });
    }

    res.json({
      success: true,
      data: muscleGroup
    });
  } catch (error) {
    console.error('Error fetching muscle group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch muscle group',
      error: error.message
    });
  }
});

/**
 * POST /api/muscle-groups
 * Izveido jaunu muskuļu grupu.
 * Obligātais lauks: name.
 * Neobligātais lauks: description.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Tiek pārbaudīti obligātie lauki.
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Muscle group name is required'
      });
    }

    // Tiek izveidota muskuļu grupa.
    const muscleGroup = await MuscleGroupModel.create(
      name.trim(),
      description || null
    );

    res.status(201).json({
      success: true,
      message: 'Muscle group created successfully',
      data: muscleGroup
    });
  } catch (error) {
    console.error('Error creating muscle group:', error);
    
    // Tiek apstrādāta nosaukuma dublēšanās kļūda.
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Muscle group with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create muscle group',
      error: error.message
    });
  }
});

module.exports = router;
