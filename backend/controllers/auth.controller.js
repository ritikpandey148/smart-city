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

// ═══ UPDATE PROFILE ═══
const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return success(res, user, 'Profile updated successfully');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

// ═══ CHANGE PASSWORD ═══
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await authService.changePassword(req.user.id, current_password, new_password);
    return success(res, result, 'Password changed successfully');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { register, login, me, logout, updateProfile, changePassword };