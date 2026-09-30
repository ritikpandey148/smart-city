// backend/middleware/error.middleware.js
const { error } = require('../utils/response.util');

const notFound = (req, res) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

const globalErrorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const statusCode = err.status || 500;
  const message = err.message || 'Internal server error';
  return error(res, message, statusCode);
};

module.exports = { notFound, globalErrorHandler };