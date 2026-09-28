const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// We keep the JWT in an httpOnly cookie (safer against XSS than
// localStorage) named "token", but also accept a Bearer header so the
// admin app / API clients that can't rely on cookies still work.
function extractToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function authGuard(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Authentication required'));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { id, role, email }
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired session'));
  }
}

module.exports = authGuard;
