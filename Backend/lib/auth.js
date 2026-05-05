const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('./DbModels/refreshTokenModel');
const UserModel = require('./DbModels/userModel');

/**
 * Autentifikācijas palīgfunkcijas.
 */
class AuthService {
  
  // Tiek ģenerēts īslaicīgs piekļuves tokens.
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

  // Tiek ģenerēts ilgāk derīgs atjaunošanas tokens.
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

  // Tiek ģenerēti abi tokeni un saglabāts atjaunošanas tokens.
  static async generateTokens(userId, email) {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);
    
    await RefreshTokenModel.create(userId, refreshToken);
    
    return { accessToken, refreshToken };
  }

  // Tiek šifrēta parole.
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Tiek salīdzināta ievadītā parole ar šifrēto paroli.
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Tiek validēti lietotāja ievades dati.
  static validateRegistration(email, password, name) {
    const errors = [];
    
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!name) errors.push('Name is required');
    
    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    // Tiek veikta e-pasta adreses pamata validācija.
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.push('Invalid email format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Tiek validēti pieslēgšanās dati.
  static validateLogin(email, password) {
    const errors = [];
    
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // No lietotāja objekta tiek izņemta parole.
  static sanitizeUser(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Tiek pārbaudīts atjaunošanas tokens.
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

  // Tiek dzēsts atjaunošanas tokens.
  static async removeRefreshToken(refreshToken) {
    const removedCount = await RefreshTokenModel.remove(refreshToken);
    return removedCount > 0;
  }

  // Tiek dzēsti visi lietotāja atjaunošanas tokeni, lai izrakstītos no visām ierīcēm.
  static async removeAllUserRefreshTokens(userId) {
    return await RefreshTokenModel.removeAllForUser(userId);
  }
}

/**
 * Starpslāņa funkcijas.
 */

// Starpslānis pārbauda JWT piekļuves tokenu.
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
    
    // Tiek pārbaudīts, vai tokens ir piekļuves tokens.
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

// Neobligāta autentifikācija, kas neaptur pieprasījumu, ja tokens nav padots.
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
