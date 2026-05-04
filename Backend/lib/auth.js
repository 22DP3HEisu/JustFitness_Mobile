const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('./DbModels/refreshTokenModel');
const UserModel = require('./DbModels/userModel');

/**
 * Authentication utility functions
 */
class AuthService {
  
  // Generate access token (short-lived)
  static generateAccessToken(userId, email) {
    return jwt.sign(
      { 
        userId, 
        email,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  // Generate refresh token (long-lived)
  static generateRefreshToken(userId, email) {
    return jwt.sign(
      { 
        userId, 
        email,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  // Generate both tokens and store refresh token
  static async generateTokens(userId, email) {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);
    
    await RefreshTokenModel.create(userId, refreshToken);
    
    return { accessToken, refreshToken };
  }

  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Validate user input
  static validateRegistration(email, password, name) {
    const errors = [];
    
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!name) errors.push('Name is required');
    
    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    // Basic email validation
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.push('Invalid email format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate login input
  static validateLogin(email, password) {
    const errors = [];
    
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Remove password from user object
  static sanitizeUser(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Verify refresh token
  static verifyRefreshToken(refreshToken) {
    return new Promise((resolve, reject) => {
      jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          return reject(new Error('Invalid or expired refresh token'));
        }

        if (decoded.type !== 'refresh') {
          return reject(new Error('Invalid token type'));
        }

        try {
          const storedRefreshToken = await RefreshTokenModel.findValid(refreshToken);
          if (!storedRefreshToken) {
            return reject(new Error('Refresh token not found'));
          }

          resolve(decoded);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  static async rotateRefreshToken(oldRefreshToken, userId, email) {
    await RefreshTokenModel.remove(oldRefreshToken);
    const refreshToken = this.generateRefreshToken(userId, email);
    await RefreshTokenModel.create(userId, refreshToken);
    return refreshToken;
  }

  // Remove refresh token
  static async removeRefreshToken(refreshToken) {
    const removedCount = await RefreshTokenModel.remove(refreshToken);
    return removedCount > 0;
  }

  // Remove all refresh tokens for a user (logout from all devices)
  static async removeAllUserRefreshTokens(userId) {
    return await RefreshTokenModel.removeAllForUser(userId);
  }
}

/**
 * Middleware functions
 */

// Verify JWT access token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Ensure it's an access token
    if (decoded.type !== 'access') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token type' 
      });
    }

    try {
      const currentUser = await UserModel.findById(decoded.userId);
      if (!currentUser) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      req.user = decoded;
      req.currentUser = currentUser;
      next();
    } catch (error) {
      console.error('Token account verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify account'
      });
    }
  });
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err || decoded.type !== 'access') {
      req.user = null;
      return next();
    }

    try {
      const currentUser = await UserModel.findById(decoded.userId);
      req.user = currentUser ? decoded : null;
      req.currentUser = currentUser || null;
    } catch (error) {
      req.user = null;
      req.currentUser = null;
    }

    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const currentUser = await UserModel.findById(req.user.userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.currentUser = currentUser;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin access'
    });
  }
};

module.exports = {
  AuthService,
  authenticateToken,
  optionalAuth,
  requireAdmin
};
