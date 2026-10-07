// backend/services/auth.service.js
const userModel = require('../models/user.model');
const providerModel = require('../models/provider.model');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/jwt.util');
const { LOCALITIES, PINCODES } = require('../config/constants');

// ============ REGISTER CITIZEN ============
const registerCitizen = async (data) => {
  const {
    first_name, last_name, gender, mobile,
    username, password, locality, pincode
  } = data;

  // Validation
  if (!first_name || !last_name || !username || !password) {
    throw { status: 400, message: 'First name, last name, username and password are required' };
  }
  if (username.length < 4) {
    throw { status: 400, message: 'Username must be at least 4 characters' };
  }
  if (password.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters' };
  }
  if (locality && !LOCALITIES.includes(locality)) {
    throw { status: 400, message: 'Invalid locality' };
  }
  if (pincode && !PINCODES.includes(pincode)) {
    throw { status: 400, message: 'Invalid pincode' };
  }

  // Check username uniqueness across both tables
  const existingUser = await userModel.findByUsername(username);
  if (existingUser) throw { status: 409, message: 'Username already taken' };

  const existingProvider = await providerModel.findByUsername(username);
  if (existingProvider) throw { status: 409, message: 'Username already taken' };

  // Hash password
  const password_hash = await hashPassword(password);

  // Create
  const userId = await userModel.createUser({
    first_name, last_name, gender, mobile,
    username, password_hash, locality, pincode, role: 'citizen'
  });

  const user = await userModel.findById(userId);

  const token = signToken({ id: user.id, username: user.username, role: 'citizen' });

  return { user, token, role: 'citizen' };
};

// ============ LOGIN ============
const login = async (username, password) => {
  if (!username || !password) {
    throw { status: 400, message: 'Username and password are required' };
  }

  let account = null;
  let role = null;
  let isProvider = false;

  // Try users table first (citizen + admin)
  account = await userModel.findByUsername(username);
  if (account) {
    role = account.role; // 'citizen' | 'admin'
  } else {
    // Try service_providers
    account = await providerModel.findByUsername(username);
    if (account) {
      role = 'provider';
      isProvider = true;
    }
  }

  // Username not found anywhere
  if (!account) {
    throw { status: 404, message: "Doesn't have account, please create" };
  }

  // Account status
  if (account.account_status !== 'active') {
    throw { status: 403, message: 'Account is not active. Please contact administrator.' };
  }

  // Password check
  const isMatch = await comparePassword(password, account.password_hash);
  if (!isMatch) {
    throw { status: 401, message: 'Invalid password' };
  }

  // Update last login
  if (isProvider) {
    await providerModel.updateLastLogin(account.id);
  } else {
    await userModel.updateLastLogin(account.id);
  }

  // Build safe user object (no password_hash)
  let safeUser;
  if (isProvider) {
    safeUser = {
      id: account.id,
      name: account.name,
      username: account.username,
      category: account.category,
      locality: account.locality,
      account_status: account.account_status,
      created_at: account.created_at,
      role: 'provider'
    };
  } else {
    safeUser = await userModel.findById(account.id);
  }

  const token = signToken({ id: account.id, username: account.username, role });

  return { user: safeUser, token, role };
};

// ============ GET ME ============
const getMe = async (id, role) => {
  if (role === 'provider') {
    const provider = await providerModel.findById(id);
    if (!provider) throw { status: 404, message: 'Provider not found' };
    return { ...provider, role: 'provider' };
  }
  const user = await userModel.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

// ============ UPDATE PROFILE ============
const updateProfile = async (userId, data) => {
  const { first_name, last_name, gender, mobile, locality, pincode } = data;

  if (!first_name || !last_name) {
    throw { status: 400, message: 'First name and last name are required' };
  }
  if (first_name.length < 2 || last_name.length < 2) {
    throw { status: 400, message: 'Names must be at least 2 characters' };
  }
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
    throw { status: 400, message: 'Enter valid 10-digit mobile number' };
  }
  if (locality && !LOCALITIES.includes(locality)) {
    throw { status: 400, message: 'Invalid locality' };
  }
  if (pincode && !PINCODES.includes(pincode)) {
    throw { status: 400, message: 'Invalid pincode' };
  }

  await userModel.updateProfile(userId, {
    first_name, last_name, gender: gender || null, mobile: mobile || null,
    locality: locality || null, pincode: pincode || null
  });

  return await userModel.findById(userId);
};

// ============ CHANGE PASSWORD ============
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: 'Current and new password are required' };
  }
  if (newPassword.length < 6) {
    throw { status: 400, message: 'New password must be at least 6 characters' };
  }
  if (currentPassword === newPassword) {
    throw { status: 400, message: 'New password must be different from current' };
  }

  const user = await userModel.findByIdWithHash(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) throw { status: 401, message: 'Current password is incorrect' };

  const newHash = await hashPassword(newPassword);
  await userModel.updatePassword(userId, newHash);

  return { success: true };
};

// ============ CHANGE USERNAME ============
const changeUsername = async (userId, currentPassword, newUsername) => {
  if (!currentPassword || !newUsername) {
    throw { status: 400, message: 'Current password and new username are required' };
  }
  if (newUsername.length < 4) {
    throw { status: 400, message: 'Username must be at least 4 characters' };
  }
  if (/\s/.test(newUsername)) {
    throw { status: 400, message: 'Username cannot contain spaces' };
  }

  const user = await userModel.findByIdWithHash(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  // Verify password
  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) throw { status: 401, message: 'Current password is incorrect' };

  // Check if same as old
  if (user.username.toLowerCase() === newUsername.toLowerCase()) {
    throw { status: 400, message: 'New username is same as current username' };
  }

  // Check uniqueness across users + providers
  const existingUser = await userModel.findByUsername(newUsername);
  if (existingUser && existingUser.id !== userId) {
    throw { status: 409, message: 'Username is already taken' };
  }
  const existingProvider = await providerModel.findByUsername(newUsername);
  if (existingProvider) {
    throw { status: 409, message: 'Username is already taken' };
  }

  // Update
  const db = require('../db');
  await db.query('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);

  return await userModel.findById(userId);
};

module.exports = { registerCitizen, login, getMe, updateProfile, changePassword, changeUsername };