// backend/controllers/auth.controller.js
const authService = require('../services/auth.service');
const { success, error } = require('../utils/response.util');

const register = async (req, res, next) => {
  try {
    const result = await authService.registerCitizen(req.body);
    return success(res, result, 'Account created successfully', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    return success(res, result, 'Login successful');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id, req.user.role);
    return success(res, user, 'User fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const logout = async (req, res) => {
  return success(res, null, 'Logged out successfully');
};

module.exports = { register, login, me, logout };