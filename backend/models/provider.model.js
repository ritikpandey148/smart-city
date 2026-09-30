// backend/models/provider.model.js
const db = require('../db');

const findByUsername = async (username) => {
  const [rows] = await db.query(
    'SELECT * FROM service_providers WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, name, username, category, locality, account_status,
            last_login, last_seen, created_at
     FROM service_providers WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await db.query(
    'UPDATE service_providers SET last_login = NOW(), last_seen = NOW() WHERE id = ?',
    [id]
  );
};

const updateLastSeen = async (id) => {
  await db.query('UPDATE service_providers SET last_seen = NOW() WHERE id = ?', [id]);
};

module.exports = {
  findByUsername,
  findById,
  updateLastLogin,
  updateLastSeen
};