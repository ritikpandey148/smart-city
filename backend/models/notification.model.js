// backend/models/notification.model.js
const db = require('../db');

const create = async (data) => {
  const {
    title, message, sender_id, sender_role,
    target_type, target_user_id, complaint_id, category
  } = data;
  const [result] = await db.query(
    `INSERT INTO notifications
      (title, message, sender_id, sender_role, target_type, target_user_id, complaint_id, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, message, sender_id || null, sender_role || 'system',
      target_type || 'all', target_user_id || null, complaint_id || null, category || null
    ]
  );
  return result.insertId;
};

const getForUser = async (userId, role) => {
  let sql = `SELECT n.*, c.complaint_id AS ref_complaint_id
             FROM notifications n
             LEFT JOIN complaints c ON n.complaint_id = c.id
             WHERE (
               n.target_type = 'all'
               OR (n.target_type = ? AND n.target_user_id = ?)
               OR (n.target_type = ? AND n.target_user_id IS NULL)
             )`;
  const params = [
    role === 'provider' ? 'provider' : 'citizen',
    role === 'provider' ? null : userId,
    role === 'provider' ? 'provider' : 'citizen'
  ];
  sql += ' ORDER BY n.created_at DESC LIMIT 50';
  const [rows] = await db.query(sql, params);
  return rows;
};

const markAsRead = async (id) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
};

module.exports = { create, getForUser, markAsRead };