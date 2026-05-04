// Load environment variables first
require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var auth = require('./routes/auth');
var exercises = require('./routes/exercises');
var workouts = require('./routes/workouts');
var muscleGroups = require('./routes/muscleGroups');
var meals = require('./routes/meals');
var nutrition = require('./routes/nutrition');
var foods = require('./routes/foods');
var dashboard = require('./routes/dashboard');
var user = require('./routes/user');
var admin = require('./routes/admin');
var water = require('./routes/water');
var UserModel = require('./lib/DbModels/userModel');
var UserSettingsModel = require('./lib/DbModels/userSettingsModel');
var WaterLogModel = require('./lib/DbModels/waterLogModel');

var app = express();

// Add CORS and CSP headers for development
app.use((req, res, next) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // CSP headers for development (more permissive)
  if (process.env.NODE_ENV !== 'production') {
    res.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:; connect-src 'self' ws: wss: http: https:;");
  }
  
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', auth);
app.use('/api/user', user);
app.use('/api/exercises', exercises);
app.use('/api/workouts', workouts);
app.use('/api/muscle-groups', muscleGroups);
app.use('/api/meals', meals);
app.use('/api/nutrition', nutrition);
app.use('/api/foods', foods);
app.use('/api/dashboard', dashboard);
app.use('/api/admin', admin);
app.use('/api/water', water);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: {
      message: message,
      status: status,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

module.exports = app;
