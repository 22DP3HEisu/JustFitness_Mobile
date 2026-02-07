const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory refresh token storage (can be moved to Redis in production)
const refreshTokens = [];

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
      { expiresIn: '7d' }
    );
  }

  // Generate both tokens and store refresh token
  static generateTokens(userId, email) {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);
    
    // Store refresh token
    refreshTokens.push({
      token: refreshToken,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
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
      jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return reject(new Error('Invalid or expired refresh token'));
        }

        // Check if refresh token exists in storage
        const storedRefreshToken = refreshTokens.find(rt => rt.token === refreshToken);
        if (!storedRefreshToken) {
          return reject(new Error('Refresh token not found'));
        }

        // Check if expired
        if (storedRefreshToken.expiresAt < new Date()) {
          // Remove expired token
          this.removeRefreshToken(refreshToken);
          return reject(new Error('Refresh token expired'));
        }

        // Verify token type
        if (decoded.type !== 'refresh') {
          return reject(new Error('Invalid token type'));
        }

        resolve(decoded);
      });
    });
  }

  // Remove refresh token
  static removeRefreshToken(refreshToken) {
    const tokenIndex = refreshTokens.findIndex(rt => rt.token === refreshToken);
    if (tokenIndex > -1) {
      refreshTokens.splice(tokenIndex, 1);
      return true;
    }
    return false;
  }

  // Get all refresh tokens for a user
  static getUserRefreshTokens(userId) {
    return refreshTokens.filter(rt => rt.userId === userId);
  }

  // Remove all refresh tokens for a user (logout from all devices)
  static removeAllUserRefreshTokens(userId) {
    const userTokens = refreshTokens.filter(rt => rt.userId === userId);
    userTokens.forEach(token => this.removeRefreshToken(token.token));
    return userTokens.length;
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

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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
    
    req.user = decoded;
    next();
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

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || decoded.type !== 'access') {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
};

module.exports = {
  AuthService,
  authenticateToken,
  optionalAuth
};