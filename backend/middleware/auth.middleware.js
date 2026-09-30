// backend/middleware/auth.middleware.js
const { verifyToken } = require('../utils/jwt.util');
const { error } = require('../utils/response.util');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication required', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Session expired. Please login again', 401);
    }
    return error(res, 'Invalid or missing token', 401);
  }
};

module.exports = authMiddleware;