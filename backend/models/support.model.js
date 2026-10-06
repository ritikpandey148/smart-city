// backend/models/support.model.js
const db = require('../db');

const create = async (data) => {
  const { user_id, subject, message } = data;
  const [result] = await db.query(
    `INSERT INTO support_messages (user_id, subject, message, status)
     VALUES (?, ?, ?, 'open')`,
    [user_id, subject, message]
  );
  return result.insertId;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT sm.*, 
            u.first_name, u.last_name, u.username, u.mobile,
            a.first_name AS replied_by_name
     FROM support_messages sm
     LEFT JOIN users u ON sm.user_id = u.id
     LEFT JOIN users a ON sm.replied_by = a.id
     WHERE sm.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const getByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, subject, message, status, admin_reply, replied_at, created_at
     FROM support_messages
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

const getAll = async (filters = {}) => {
  let sql = `SELECT sm.*, u.first_name, u.last_name, u.username, u.mobile
             FROM support_messages sm
             LEFT JOIN users u ON sm.user_id = u.id
             WHERE 1=1`;
  const params = [];

  if (filters.status) {
    sql += ' AND sm.status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    sql += ' AND (sm.subject LIKE ? OR sm.message LIKE ? OR u.username LIKE ?)';
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY sm.created_at DESC';

  const [rows] = await db.query(sql, params);
  return rows;
};

const updateStatus = async (id, status, adminReply, adminId) => {
  await db.query(
    `UPDATE support_messages
     SET status = ?, admin_reply = ?, replied_by = ?, replied_at = NOW()
     WHERE id = ?`,
    [status, adminReply || null, adminId, id]
  );
};

module.exports = {
  create,
  findById,
  getByUserId,
  getAll,
  updateStatus
};