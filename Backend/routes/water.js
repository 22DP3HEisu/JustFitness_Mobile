const express = require('express');
const { authenticateToken } = require('../lib/auth');
const WaterLogModel = require('../lib/DbModels/waterLogModel');

const router = express.Router();

const toPositiveAmount = (value) => {
  const amount = parseInt(value, 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const summarize = (entries) => ({
  entries,
  totalMl: entries.reduce((sum, entry) => sum + Number(entry.amount_ml || 0), 0),
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const entries = await WaterLogModel.findByUserAndDate(req.user.userId, req.query.date || null);

    res.json({
      success: true,
      data: summarize(entries),
    });
  } catch (error) {
    console.error('Error fetching water logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch water logs',
      error: error.message,
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const amountMl = toPositiveAmount(req.body.amountMl ?? req.body.amount_ml);

    if (!amountMl) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid water amount',
      });
    }

    const loggedAt = req.body.loggedAt || (req.body.date ? `${req.body.date} ${new Date().toTimeString().slice(0, 8)}` : null);
    const entry = await WaterLogModel.create(req.user.userId, amountMl, loggedAt);
    const entries = await WaterLogModel.findByUserAndDate(req.user.userId, req.body.date || null);

    res.status(201).json({
      success: true,
      message: 'Water logged',
      data: {
        entry,
        ...summarize(entries),
      },
    });
  } catch (error) {
    console.error('Error logging water:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log water',
      error: error.message,
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await WaterLogModel.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Water log not found',
      });
    }

    if (Number(entry.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own water logs',
      });
    }

    await WaterLogModel.delete(entry.id);
    const entries = await WaterLogModel.findByUserAndDate(req.user.userId, req.query.date || null);

    res.json({
      success: true,
      message: 'Water log deleted',
      data: summarize(entries),
    });
  } catch (error) {
    console.error('Error deleting water log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete water log',
      error: error.message,
    });
  }
});

module.exports = router;
