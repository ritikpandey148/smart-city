// backend/middleware/role.middleware.js
const { error } = require('../utils/response.util');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Authentication required', 401);
    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 'Access denied: insufficient permissions', 403);
    }
    next();
  };
};

module.exports = roleMiddleware;