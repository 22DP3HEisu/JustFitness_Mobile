const express = require('express');
const { authenticateToken } = require('../lib/auth');
const MealModel = require('../lib/DbModels/mealModel');
const WaterLogModel = require('../lib/DbModels/waterLogModel');

const router = express.Router();

const summarizeWater = (entries) => ({
  entries,
  totalMl: entries.reduce((sum, entry) => sum + Number(entry.amount_ml || 0), 0),
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const date = req.query.date || null;
    const [meals, waterEntries] = await Promise.all([
      MealModel.findByUserId(userId, date),
      WaterLogModel.findByUserAndDate(userId, date),
    ]);

    res.json({
      success: true,
      data: {
        date,
        meals,
        water: summarizeWater(waterEntries),
      },
    });
  } catch (error) {
    console.error('Error fetching nutrition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutrition data',
      error: error.message,
    });
  }
});

module.exports = router;
