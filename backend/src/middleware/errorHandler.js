const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// Registered last in app.js. Every controller/service simply throws or
// calls next(err); nothing formats its own error responses.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let { statusCode, message, details } = err;

  if (!(err instanceof ApiError)) {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      statusCode = 409;
      message = 'A record with these details already exists';
      details = err.keyValue;
    } else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      details = Object.values(err.errors || {}).map((e) => e.message);
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for ${err.path}`;
    } else {
      statusCode = statusCode || 500;
      message = message || 'Internal server error';
    }
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const body = {
    success: false,
    message: message || 'Internal server error',
  };
  if (details) body.details = details;
  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode || 500).json(body);
}

module.exports = errorHandler;
