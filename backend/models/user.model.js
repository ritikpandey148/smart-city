// backend/models/user.model.js
const db = require('../db');

const findByUsername = async (username) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, first_name, last_name, gender, mobile, username,
            locality, pincode, role, account_status, last_login, last_seen, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findByIdWithHash = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const createUser = async (data) => {
  const {
    first_name, last_name, gender, mobile,
    username, password_hash, locality, pincode, role
  } = data;
  const [result] = await db.query(
    `INSERT INTO users
      (first_name, last_name, gender, mobile, username, password_hash, locality, pincode, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, gender, mobile, username, password_hash, locality, pincode, role || 'citizen']
  );
  return result.insertId;
};

const updateLastLogin = async (id) => {
  await db.query('UPDATE users SET last_login = NOW(), last_seen = NOW() WHERE id = ?', [id]);
};

const updateLastSeen = async (id) => {
  await db.query('UPDATE users SET last_seen = NOW() WHERE id = ?', [id]);
};

const updateProfile = async (id, data) => {
  const { first_name, last_name, gender, mobile, locality, pincode } = data;
  await db.query(
    `UPDATE users 
     SET first_name = ?, last_name = ?, gender = ?, mobile = ?, locality = ?, pincode = ?
     WHERE id = ?`,
    [first_name, last_name, gender, mobile, locality, pincode, id]
  );
};

const updatePassword = async (id, password_hash) => {
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
};

module.exports = {
  findByUsername,
  findById,
  findByIdWithHash,
  createUser,
  updateLastLogin,
  updateLastSeen,
  updateProfile,
  updatePassword
};