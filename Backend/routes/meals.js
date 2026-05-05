const express = require('express');
const { authenticateToken } = require('../lib/auth');
const MealModel = require('../lib/DbModels/mealModel');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const meals = await MealModel.findByUserId(userId, req.query.date || null);
    
    res.json({
      success: true,
      data: meals
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meals',
      error: error.message
    });
  }
});

// POST /api/meals/:mealType/foods - ēdienu pievienošana maltītei.
router.post('/:mealType/foods', authenticateToken, async (req, res) => {
  try {
    const { mealType } = req.params;
    const { foods, date } = req.body; 
    const userId = req.user.userId;

    if (!Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'foods must be a non-empty array'
      });
    }

    // Tiek iegūts šodienas datums.
    const selectedDate = date || new Date().toISOString().split('T')[0];

    // Tiek atrasta vai izveidota maltīte.
    let mealId = null;
    const existingMeals = await MealModel.findByUserId(userId, selectedDate);
    const existingMeal = existingMeals.find(m => m.name === mealType);

    if (existingMeal) {
      mealId = existingMeal.id;
    } else {
      // Ja maltīte neeksistē, tiek izveidota jauna maltīte.
      const newMeal = await MealModel.createMeal(userId, mealType, selectedDate);
      mealId = newMeal.id;
    }

    // Katrs izvēlētais ēdiens tiek pievienots maltītei.
    for (const food of foods) {
      await MealModel.addFood(mealId, food.id, food.quantity, 'g');
    }

    // Tiek atgriezta atjauninātā maltīte ar ēdieniem.
    const updatedMeal = await MealModel.findById(mealId);

    res.json({
      success: true,
      message: 'Foods added to meal',
      data: updatedMeal
    });
  } catch (error) {
    console.error('Error adding foods to meal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add foods to meal',
      error: error.message
    });
  }
});

router.delete('/:mealId/foods/:foodId', authenticateToken, async (req, res) => {
  try {
    const { mealId, foodId } = req.params;
    const userId = req.user.userId;

    await MealModel.removeFood(foodId);

    res.json({
      success: true,
      message: 'Food removed from meal'
    });
  } catch (error) {
    console.error('Error removing food from meal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove food from meal',
      error: error.message
    });
  }
});

module.exports = router;
