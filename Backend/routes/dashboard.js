const express = require('express');
const { authenticateToken } = require('../lib/auth');
const MealModel = require('../lib/DbModels/mealModel');
const UserSettingsModel = require('../lib/DbModels/userSettingsModel');
const WeightHistoryModel = require('../lib/DbModels/weightHistoryModel');
const WorkoutModel = require('../lib/DbModels/workoutModel');
const WorkoutLogModel = require('../lib/DbModels/workoutLogModel');

const router = express.Router();

const DEFAULTS = {
  calorieGoal: 1600,
  proteinGoal: 30,
  fatGoal: 40,
  carbGoal: 30,
  stepGoal: 10000,
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(toNumber(value) * factor) / factor;
};

const convertWeightFromKg = (weight, unit = 'kg') => {
  if (weight == null) {
    return null;
  }

  const value = toNumber(weight);
  return unit === 'lb' || unit === 'lbs' ? value / 0.45359237 : value;
};

const getFoodCalories = (food) => (
  toNumber(food.calories_per_100g) * toNumber(food.quantity, 100) / 100
);

const getFoodMacro = (food, key) => (
  toNumber(food[key]) * toNumber(food.quantity, 100) / 100
);

const getDurationMinutes = (workoutLog) => {
  if (!workoutLog.started_at || !workoutLog.completed_at) {
    return 0;
  }

  const startedAt = new Date(workoutLog.started_at).getTime();
  const completedAt = new Date(workoutLog.completed_at).getTime();

  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt <= startedAt) {
    return 0;
  }

  return Math.round((completedAt - startedAt) / 60000);
};

const formatPeriodRange = (entries) => {
  const dates = entries
    .map((entry) => new Date(entry?.created_at))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) {
    return '';
  }

  const sameYear = dates[0].getFullYear() === dates[dates.length - 1].getFullYear();
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  const first = formatter.format(dates[0]);
  const last = formatter.format(dates[dates.length - 1]);

  return first === last ? first : `${first} - ${last}`;
};

const uniqueById = (entries) => {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) {
      return false;
    }

    seen.add(entry.id);
    return true;
  });
};

const safely = async (fallback, task) => {
  try {
    return await task();
  } catch (error) {
    console.warn('Dashboard partial data unavailable:', error.message);
    return fallback;
  }
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const weightPeriod = req.query.weightPeriod.toLowerCase() || 'month';
    
    const [settings, meals, workouts, workoutLogs, weightHistory] = await Promise.all([
      safely([], () => UserSettingsModel.findByUserId(userId)),
      safely([], () => MealModel.findByUserId(userId)),
      safely([], () => WorkoutModel.findByUserId(userId, 500, 0)),
      safely([], () => WorkoutLogModel.findByUserId(userId, 500, 0)),
      safely([], () => WeightHistoryModel.findByPeriod(userId, weightPeriod)),
    ]);

    const foods = meals.flatMap((meal) => meal.foods || []);
    const caloriesFromMeals = foods.reduce((sum, food) => sum + getFoodCalories(food), 0);
    const protein = foods.reduce((sum, food) => sum + getFoodMacro(food, 'protein_per_100g'), 0);
    const fat = foods.reduce((sum, food) => sum + getFoodMacro(food, 'fat_per_100g'), 0);
    const carbs = foods.reduce((sum, food) => sum + getFoodMacro(food, 'carbs_per_100g'), 0);
    const macroTotal = protein + fat + carbs;
    const proteinGoalGrams = toNumber(settings?.protein_goal);
    const fatGoalGrams = toNumber(settings?.fat_goal);
    const carbGoalGrams = toNumber(settings?.carb_goal);
    const macroGoalTotal = proteinGoalGrams + fatGoalGrams + carbGoalGrams;
    
    const completedLogs = workoutLogs.filter((log) => log.completed_at);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = completedLogs.filter((log) => new Date(log.completed_at) >= monthStart);
    const workoutMinutes = completedThisMonth.reduce((sum, log) => sum + getDurationMinutes(log), 0);

    const calorieGoal = toNumber(settings?.calorie_goal, DEFAULTS.calorieGoal);
    const workoutCalories = 0;
    const displayWeightUnit = settings?.weight_unit || 'kg';

    const latestWeight = weightHistory[0] || null;
    const oldestWeight = weightHistory[weightHistory.length - 1] || null;

    res.json({
      success: true,
      data: {
        goals: {
          calories: calorieGoal,
          protein: macroGoalTotal ? round((proteinGoalGrams / macroGoalTotal) * 100) : DEFAULTS.proteinGoal,
          fat: macroGoalTotal ? round((fatGoalGrams / macroGoalTotal) * 100) : DEFAULTS.fatGoal,
          carbs: macroGoalTotal ? round((carbGoalGrams / macroGoalTotal) * 100) : DEFAULTS.carbGoal,
          weight: settings?.goal_weight ? toNumber(settings.goal_weight) : null,
          steps: toNumber(settings?.step_goal, DEFAULTS.stepGoal),
        },
        nutrition: {
          meals,
          caloriesFromMeals: round(caloriesFromMeals),
          caloriesFromWorkouts: workoutCalories,
          caloriesRemaining: round(calorieGoal - caloriesFromMeals + workoutCalories),
          macros: {
            protein: {
              grams: round(protein, 1),
              percent: macroTotal ? round((protein / macroTotal) * 100) : 0,
            },
            fat: {
              grams: round(fat, 1),
              percent: macroTotal ? round((fat / macroTotal) * 100) : 0,
            },
            carbs: {
              grams: round(carbs, 1),
              percent: macroTotal ? round((carbs / macroTotal) * 100) : 0,
            },
          },
        },
        workouts: {
          total: workouts.length,
          completedThisMonth: completedThisMonth.length,
          caloriesBurned: workoutCalories,
          durationMinutes: workoutMinutes,
        },
        steps: {
          today: 0,
          goal: toNumber(settings?.step_goal, DEFAULTS.stepGoal),
        },
        weight: {
          period: weightPeriod,
          entries: weightHistory.map((entry) => ({
            id: entry.id,
            weight: round(convertWeightFromKg(entry.weight, displayWeightUnit), 1),
            created_at: entry.created_at,
          })),
          latest: latestWeight ? round(convertWeightFromKg(latestWeight.weight, displayWeightUnit), 1) : null,
          comparison: oldestWeight ? round(convertWeightFromKg(oldestWeight.weight, displayWeightUnit), 1) : null,
          change: latestWeight && oldestWeight
            ? round(convertWeightFromKg(toNumber(latestWeight.weight) - toNumber(oldestWeight.weight), displayWeightUnit), 1)
            : null,
          goal: settings?.goal_weight ? round(convertWeightFromKg(settings.goal_weight, displayWeightUnit), 1) : null,
          unit: displayWeightUnit,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
});

module.exports = router;
