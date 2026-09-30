// backend/utils/password.util.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const hashPassword = async (plain) => {
  return await bcrypt.hash(plain, SALT_ROUNDS);
};

const comparePassword = async (plain, hash) => {
  return await bcrypt.compare(plain, hash);
};

module.exports = { hashPassword, comparePassword };