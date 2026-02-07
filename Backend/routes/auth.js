const express = require('express');
const { 
  AuthService, 
  authenticateToken 
} = require('../lib/auth');
const UserModel = require('../lib/userModel');
const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validate input
    const validation = AuthService.validateRegistration(email, password, name);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create new user in database
    const newUser = await UserModel.create({
      email,
      password: hashedPassword,
      name,
      phone
    });

    // Generate tokens
    const { accessToken, refreshToken } = AuthService.generateTokens(newUser.id, newUser.email);

    // Return user data (without password)
    const userWithoutPassword = AuthService.sanitizeUser(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d'
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

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = AuthService.validateLogin(email, password);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Find user in database
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login in database
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = AuthService.generateTokens(user.id, user.email);

    // Return user data (without password)
    const userWithoutPassword = AuthService.sanitizeUser(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d'
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

// Get current user profile (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userWithoutPassword = AuthService.sanitizeUser(user);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token route (doesn't require access token)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = await AuthService.verifyRefreshToken(refreshToken);

    // Find user in database
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token (keep same refresh token)
    const newAccessToken = AuthService.generateAccessToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        accessTokenExpiresIn: '15m'
        // Note: refresh token remains the same
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

// Logout route - invalidate refresh token
router.post('/logout', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const removed = AuthService.removeRefreshToken(refreshToken);
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

// Logout from all devices
router.post('/logout-all', authenticateToken, (req, res) => {
  try {
    const removedCount = AuthService.removeAllUserRefreshTokens(req.user.userId);

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

// Test route to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;