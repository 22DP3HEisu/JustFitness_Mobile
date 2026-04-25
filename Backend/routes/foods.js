const express = require('express');
const { authenticateToken } = require('../lib/auth');
const FoodModel = require('../lib/DbModels/foodModel');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const foods = await FoodModel.findAll();

    res.json({
      success: true,
      data: foods
    });
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch foods',
      error: error.message
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Food name is required'
      });
    }

    if (
      caloriesPer100g === undefined ||
      proteinPer100g === undefined ||
      carbsPer100g === undefined ||
      fatPer100g === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'All nutrition values are required'
      });
    }

    const food = await FoodModel.createFood(
      req.user.userId,
      name.trim(),
      parseFloat(caloriesPer100g),
      parseFloat(proteinPer100g),
      parseFloat(carbsPer100g),
      parseFloat(fatPer100g)
    );

    res.status(201).json({
      success: true,
      message: 'Food created successfully',
      data: food
    });
  } catch (error) {
    console.error('Error creating food:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Food with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create food',
      error: error.message
    });
  }
});

module.exports = router;
