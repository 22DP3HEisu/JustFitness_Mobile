// Maršruti nodrošina ēdienu izveidi, izgūšanu, atjaunināšanu un dzēšanu.
// Tie apstrādā gan lietotāja privātos ēdienus, gan publiski pieejamos ēdienus ar uzturvērtības datiem.
const express = require('express');
const { authenticateToken } = require('../lib/auth');
const FoodModel = require('../lib/DbModels/foodModel');
const UserModel = require('../lib/DbModels/userModel');
const router = express.Router();

const isAdminRequest = async (req) => {
  const user = await UserModel.findById(req.user.userId);
  return user?.role === 'admin';
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const foods = await FoodModel.findVisibleToUser(req.user.userId);

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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const food = await FoodModel.findById(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(food.user_id) !== Number(req.user.userId) && !food.is_public) {
      return res.status(403).json({
        success: false,
        message: 'You can only view public foods or foods you created'
      });
    }

    res.json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Error fetching food:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch food',
      error: error.message
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic } = req.body;

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
      parseFloat(fatPer100g),
      isPublic === true
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

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, isPublic } = req.body;

    const food = await FoodModel.findById(id);
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(food.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit foods you created'
      });
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Food name is required'
      });
    }

    const nextValues = {
      name: name !== undefined ? name.trim() : food.name,
      caloriesPer100g: caloriesPer100g !== undefined ? parseFloat(caloriesPer100g) : food.calories_per_100g,
      proteinPer100g: proteinPer100g !== undefined ? parseFloat(proteinPer100g) : food.protein_per_100g,
      carbsPer100g: carbsPer100g !== undefined ? parseFloat(carbsPer100g) : food.carbs_per_100g,
      fatPer100g: fatPer100g !== undefined ? parseFloat(fatPer100g) : food.fat_per_100g,
    };

    if (
      [nextValues.caloriesPer100g, nextValues.proteinPer100g, nextValues.carbsPer100g, nextValues.fatPer100g]
        .some((value) => Number.isNaN(Number(value)))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nutrition values must be valid numbers'
      });
    }

    const updated = await FoodModel.update(
      id,
      nextValues.name,
      nextValues.caloriesPer100g,
      nextValues.proteinPer100g,
      nextValues.carbsPer100g,
      nextValues.fatPer100g,
      isPublic !== undefined ? isPublic === true : food.is_public
    );

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update food'
      });
    }

    const updatedFood = await FoodModel.findById(id);
    res.json({
      success: true,
      message: 'Food updated successfully',
      data: updatedFood
    });
  } catch (error) {
    console.error('Error updating food:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Food with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update food',
      error: error.message
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const food = await FoodModel.findById(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    const isAdmin = await isAdminRequest(req);

    if (!isAdmin && Number(food.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete foods you created'
      });
    }

    const deleted = await FoodModel.delete(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete food'
      });
    }

    res.json({
      success: true,
      message: 'Food deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting food:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete food',
      error: error.message
    });
  }
});

module.exports = router;
