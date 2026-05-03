const express = require('express');
const { 
  AuthService, 
  authenticateToken 
} = require('../lib/auth');
const UserModel = require('../lib/DbModels/userModel');
const UserSettingsModel = require('../lib/DbModels/userSettingsModel');
const WeightHistoryModel = require('../lib/DbModels/weightHistoryModel');
const router = express.Router();

// Konvertē mārciņas uz kilogramiem
const toKilograms = (weight, unit = 'kg') => {
  const value = parseFloat(weight);
  if (!Number.isFinite(value)) {
    return null;
  }
  return unit === 'lb' || unit === 'lbs' ? value * 0.45359237 : value;
};

// Konvertē augumu uz cm
const toCentimeters = (height, unit = 'cm') => {
  const value = parseFloat(height);
  if (!Number.isFinite(value)) {
    return null;
  }
  // 1 colla (inch) = 2.54 cm
  return unit === 'in' ? Math.round(value * 2.54) : value;
};

// Konvertē augumu no cm uz lietotāja vienībām
const convertHeightFromCm = (heightCm, unit = 'cm') => {
  const value = parseFloat(heightCm);
  if (!Number.isFinite(value)) {
    return null;
  }
  // 1 colla (inch) = 2.54 cm
  return unit === 'in' ? value / 2.54 : value;
};

const convertWeightFromKg = (weightKg, unit = 'kg') => {
  const value = parseFloat(weightKg);
  if (!Number.isFinite(value)) {
    return null;
  }
  return unit === 'lb' || unit === 'lbs' ? value / 0.45359237 : value;
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Iegūst lietotāja datus - GET /api/user/
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Lietotājs nav atrasts'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Kļūda iegūstot lietotāja datus:', error);
    res.status(500).json({
      success: false,
      message: 'Iekšējā servera kļūda'
    });
  }
});

// Atjaunina lietotāja datus (vārds, e-pasts) - PUT /api/user/
router.put("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;

    // Validācijai
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Vārds un e-pasts ir obligāti'
      });
    }

    // Pārbauda, vai e-pasts jau ir izmantots (ja e-pasts mainīts)
    const currentUser = await UserModel.findById(userId);
    if (email !== currentUser.email) {
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Lietotājs ar šo e-pasta adresi jau eksistē'
        });
      }
    }

    // Atjaunina lietotāju
    const updatedUser = await UserModel.updateProfile(userId, { name, email });

    res.json({
      success: true,
      message: 'Lietotāja dati atjaunināti',
      data: updatedUser
    });
  } catch (error) {
    console.error('Kļūda atjauninot lietotāja datus:', error);
    res.status(500).json({
      success: false,
      message: 'Iekšējā servera kļūda'
    });
  }
});

// Mainīt paroli - POST /api/user/change-password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validācijai
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Visas paroles ir obligātas'
      });
    }

    // Pārbauda, vai jaunā parole un apstiprinājums sakrīt
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Jaunā parole un apstiprinājums nesakrīt'
      });
    }

    // Pārbauda, vai jaunā parole ir vismaz 8 rakstzīmes gara
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Jaunā parole ir jābūt vismaz 8 rakstzīmes garai'
      });
    }

    // Iegūst lietotāja datus ar paroli
    const user = await UserModel.findById(userId, true);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Lietotājs nav atrasts'
      });
    }

    // Pārbauda seno paroli
    const isValidPassword = await AuthService.comparePassword(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Vecā parole ir nepareiza'
      });
    }

    // Jaunā parole nedrīkst būt tāda pati kā vecā
    const isSamePassword = await AuthService.comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Jaunā parole nedrīkst būt tāda pati kā vecā'
      });
    }

    // Hash jaunā parole
    const hashedPassword = await AuthService.hashPassword(newPassword);

    // Atjaunina paroli datubāzē
    const updatedUser = await UserModel.updatePassword(userId, hashedPassword);

    res.json({
      success: true,
      message: 'Parole veiksmīgi mainīta',
      data: updatedUser
    });
  } catch (error) {
    console.error('Kļūda mainot paroli:', error);
    res.status(500).json({
      success: false,
      message: 'Iekšējā servera kļūda'
    });
  }
});

// Iegūst lietotāja iestatījumus - GET /api/user/settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const settings = await UserSettingsModel.findByUserId(userId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Lietotāja iestatījumi nav atrasti'
      });
    }

    // Konvertē augumu no cm uz lietotāja vienībām
    const displayHeight = settings.height ? convertHeightFromCm(settings.height, settings.height_unit) : null;

    res.json({
      success: true,
      data: {
        ...settings,
        height: displayHeight
      }
    });
  } catch (error) {
    console.error('Kļūda iegūstot lietotāja iestatījumus:', error);
    res.status(500).json({
      success: false,
      message: 'Iekšējā servera kļūda'
    });
  }
});

// Atjaunina lietotāja iestatījumus - PUT /api/user/settings
router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      language,
      gender,
      birthDate,
      height,
      heightUnit,
      weightUnit,
      distanceUnit,
      goalWeight,
      calorieGoal,
      proteinGoal,
      fatGoal,
      carbGoal
    } = req.body;

    const settings = await UserSettingsModel.findByUserId(userId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Lietotāja iestatījumi nav atrasti'
      });
    }

    const updates = {};

    if (hasOwn(req.body, 'language')) updates.language = language;
    if (hasOwn(req.body, 'gender')) updates.gender = gender;
    if (hasOwn(req.body, 'birthDate')) updates.birthDate = birthDate;
    if (hasOwn(req.body, 'heightUnit')) updates.heightUnit = heightUnit;
    if (hasOwn(req.body, 'weightUnit')) updates.weightUnit = weightUnit;
    if (hasOwn(req.body, 'distanceUnit')) updates.distanceUnit = distanceUnit;
    if (hasOwn(req.body, 'calorieGoal')) updates.calorieGoal = calorieGoal;
    if (hasOwn(req.body, 'proteinGoal')) updates.proteinGoal = proteinGoal;
    if (hasOwn(req.body, 'fatGoal')) updates.fatGoal = fatGoal;
    if (hasOwn(req.body, 'carbGoal')) updates.carbGoal = carbGoal;

    if (hasOwn(req.body, 'height')) {
      // Konvertē augumu uz cm pirms glabāšanas
      const sourceHeightUnit = heightUnit || settings.height_unit || 'cm';
      updates.height = height == null || height === '' ? null : toCentimeters(height, sourceHeightUnit);
    }

    if (hasOwn(req.body, 'goalWeight')) {
      const sourceWeightUnit = weightUnit || settings.weight_unit || 'kg';
      updates.goalWeight = goalWeight == null || goalWeight === '' ? null : toKilograms(goalWeight, sourceWeightUnit);
    }

    // Atjaunina iestatījumus - konvertē uz pareizajiem lauku nosaukumiem
    const updatedSettings = await UserSettingsModel.update(userId, updates);

    // Konvertē augumu atpakaļ uz lietotāja vienībām atbildē
    const displayHeight = updatedSettings.height ? convertHeightFromCm(updatedSettings.height, updatedSettings.height_unit) : null;

    res.json({
      success: true,
      message: 'Lietotāja iestatījumi atjaunināti',
      data: {
        ...updatedSettings,
        height: displayHeight
      }
    });
  } catch (error) {
    console.error('Kļūda atjauninot lietotāja iestatījumus:', error);
    res.status(500).json({
      success: false,
      message: 'Iekšējā servera kļūda'
    });
  }
});

router.get("/weight", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await UserSettingsModel.findByUserId(userId);
    const latestWeight = await WeightHistoryModel.getLatestEntry(userId);
    const weightUnit = settings?.weight_unit || 'kg';

    res.json({
      success: true,
      data: {
        unit: weightUnit,
        latest: latestWeight ? {
          ...latestWeight,
          weight: convertWeightFromKg(latestWeight.weight, weightUnit)
        } : null
      }
    });
  } catch (error) {
    console.error('Error getting weight:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post("/weight", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await UserSettingsModel.findByUserId(userId);
    const weightUnit = settings?.weight_unit || 'kg';
    const weightKg = toKilograms(req.body.weight, req.body.weightUnit || weightUnit);

    if (weightKg == null || weightKg <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a valid weight'
      });
    }

    const createdWeight = await WeightHistoryModel.addEntry(userId, weightKg);

    res.status(201).json({
      success: true,
      message: 'Weight saved',
      data: {
        ...createdWeight,
        weight: convertWeightFromKg(createdWeight.weight, weightUnit),
        unit: weightUnit
      }
    });
  } catch (error) {
    console.error('Error saving weight:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
