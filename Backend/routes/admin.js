const express = require('express');
const { AuthService, authenticateToken, requireAdmin } = require('../lib/auth');
const UserModel = require('../lib/DbModels/userModel');
const UserSettingsModel = require('../lib/DbModels/userSettingsModel');
const FoodModel = require('../lib/DbModels/foodModel');
const ExerciseModel = require('../lib/DbModels/exerciseModel');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.findAll(500, 0);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findByIdForAdmin(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const settings = await UserSettingsModel.findByUserId(user.id);

    res.json({
      success: true,
      data: {
        user,
        settings
      }
    });
  } catch (error) {
    console.error('Error fetching admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await UserModel.findByIdForAdmin(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (email !== undefined && !email.trim().includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be user or admin'
      });
    }

    if (email !== undefined && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await UserModel.findByEmailIncludingInactive(email);
      if (existingUser && Number(existingUser.id) !== Number(user.id)) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    const updatedUser = await UserModel.updateProfile(user.id, {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? email.trim() : undefined,
      role
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findByIdForAdmin(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (Number(user.id) === Number(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account'
      });
    }

    const deleted = await UserModel.deactivate(user.id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

    await AuthService.removeAllUserRefreshTokens(user.id);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
});

router.post('/users/:id/reactivate', async (req, res) => {
  try {
    const user = await UserModel.findByIdForAdmin(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const reactivated = await UserModel.reactivate(user.id);
    if (!reactivated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reactivate user'
      });
    }

    const updatedUser = await UserModel.findByIdForAdmin(user.id);
    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error reactivating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user',
      error: error.message
    });
  }
});

router.get('/users/:id/foods', async (req, res) => {
  try {
    const user = await UserModel.findByIdForAdmin(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const foods = await FoodModel.findByUserId(user.id);
    res.json({
      success: true,
      data: foods
    });
  } catch (error) {
    console.error('Error fetching admin user foods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user foods',
      error: error.message
    });
  }
});

router.get('/users/:id/exercises', async (req, res) => {
  try {
    const user = await UserModel.findByIdForAdmin(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const exercises = await ExerciseModel.findByUserId(user.id);
    res.json({
      success: true,
      data: exercises
    });
  } catch (error) {
    console.error('Error fetching admin user exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user exercises',
      error: error.message
    });
  }
});

module.exports = router;
