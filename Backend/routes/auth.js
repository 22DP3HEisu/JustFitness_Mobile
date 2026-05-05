const express = require('express');
const { 
  AuthService, 
  authenticateToken 
} = require('../lib/auth');
const UserModel = require('../lib/DbModels/userModel');
const UserSettingsModel = require('../lib/DbModels/userSettingsModel');
const WeightHistoryModel = require('../lib/DbModels/weightHistoryModel');
const router = express.Router();

const toKilograms = (weight, unit = 'kg') => {
  const value = parseFloat(weight);
  if (!Number.isFinite(value)) {
    return null;
  }

  return unit === 'lb' || unit === 'lbs' ? value * 0.45359237 : value;
};

const toCentimeters = (height, unit = 'cm') => {
  const value = parseFloat(height);
  if (!Number.isFinite(value)) {
    return null;
  }

  return unit === 'in' ? value * 2.54 : value;
};

// Reģistrācijas maršruts.
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      gender, 
      birthDate,
      height, 
      heightUnit, 
      weight, 
      weightUnit, 
      goalWeight,
      calorieGoal,
      proteinGoal,
      fatGoal,
      carbGoal,
      stepGoal,
      language
    } = req.body;

    // Tiek validēti ievades dati.
    const validation = AuthService.validateRegistration(email, password, name);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Tiek pārbaudīts, vai lietotājs jau eksistē.
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Tiek šifrēta parole.
    const hashedPassword = await AuthService.hashPassword(password);

    // Izveido jaunu lietotāju datubāzē
    const newUser = await UserModel.create({
      email,
      password: hashedPassword,
      name
    });

    // Izveido lietotāja iestatījumus ar mērķiem
    const goalWeightKg = goalWeight ? toKilograms(goalWeight, weightUnit) : null;

    await UserSettingsModel.create(newUser.id, {
      language: language || 'en',
      gender: gender || null,
      birthDate: birthDate || null,
      height: height ? toCentimeters(height, heightUnit) : null,
      heightUnit: heightUnit || 'cm',
      weightUnit: weightUnit || 'kg',
      distanceUnit: 'km',
      goalWeight: goalWeightKg,
      calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
      proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
      fatGoal: fatGoal ? parseFloat(fatGoal) : null,
      carbGoal: carbGoal ? parseFloat(carbGoal) : null,
      stepGoal: stepGoal ? parseInt(stepGoal, 10) : 10000
    });

    if (weight) {
      try {
        const weightKg = toKilograms(weight, weightUnit);

        if (weightKg == null) {
          throw new Error('Invalid weight value');
        }

        await WeightHistoryModel.addEntry(
          newUser.id,
          weightKg
        );
      } catch (weightError) {
        console.warn('Could not create initial weight history entry:', weightError.message);
      }
    }

    // Iegūst izveidotos iestatījumus
    const userSettings = await UserSettingsModel.findByUserId(newUser.id);

    // Tiek ģenerēti autentifikācijas tokeni.
    const { accessToken, refreshToken } = await AuthService.generateTokens(newUser.id, newUser.email);

    // Tiek atgriezti lietotāja dati bez paroles.
    const userWithoutPassword = AuthService.sanitizeUser(newUser);
    userWithoutPassword.settings = userSettings;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// Pieslēgšanās maršruts.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tiek validēti ievades dati.
    const validation = AuthService.validateLogin(email, password);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Lietotājs tiek sameklēts datubāzē.
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Tiek pārbaudīta parole.
    const isValidPassword = await AuthService.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Datubāzē tiek atjaunināts pēdējās pieslēgšanās laiks.
    await UserModel.updateLastLogin(user.id);

    // Tiek ģenerēti autentifikācijas tokeni.
    const { accessToken, refreshToken } = await AuthService.generateTokens(user.id, user.email);

    // Tiek atgriezti lietotāja dati bez paroles.
    const userWithoutPassword = AuthService.sanitizeUser(user);
    userWithoutPassword.settings = await UserSettingsModel.findByUserId(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Tokena atjaunošanas maršruts, kuram nav nepieciešams piekļuves tokens.
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Tiek pārbaudīts atjaunošanas tokens.
    const decoded = await AuthService.verifyRefreshToken(refreshToken);

    // Lietotājs tiek sameklēts datubāzē.
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Atjaunošanas tokens tiek nomainīts, lai sesija varētu turpināties droši.
    const newRefreshToken = await AuthService.rotateRefreshToken(refreshToken, user.id, user.email);
    const newAccessToken = AuthService.generateAccessToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          ...AuthService.sanitizeUser(user),
          settings: await UserSettingsModel.findByUserId(user.id)
        },
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

// Izrakstīšanās maršruts dzēš konkrētās ierīces atjaunošanas tokenu.
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Tiek dzēsts atjaunošanas tokens. if provided
    if (refreshToken) {
      const removed = await AuthService.removeRefreshToken(refreshToken);
      if (removed) {
        console.log('Refresh token successfully removed');
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

// Izrakstīšanās no visām ierīcēm.
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Tiek dzēsti visi šī lietotāja atjaunošanas tokeni.
    const removedCount = await AuthService.removeAllUserRefreshTokens(req.user.userId);

    res.json({
      success: true,
      message: `Logged out from ${removedCount} devices successfully`
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

module.exports = router;
