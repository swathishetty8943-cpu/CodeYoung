const ApiError = require('../utils/ApiError');

// Usage: roleGuard('admin') or roleGuard('parent', 'mentor')
// Must run after authGuard so req.user is already populated.
function roleGuard(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
}

module.exports = roleGuard;
