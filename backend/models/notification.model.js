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

// ═══ Helper: role ko target_type me convert karo ═══
const roleToTarget = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'provider') return 'provider';
  return 'citizen';
};

// ═══ FETCH notifications for a user (citizen / provider / admin) ═══
const getForUser = async (userId, role) => {
  const targetType = roleToTarget(role);

  const sql = `SELECT 
                 n.id, n.title, n.message, n.sender_role, n.target_type,
                 n.complaint_id, n.category, n.is_read, n.created_at,
                 c.complaint_id AS ref_complaint_id,
                 CASE 
                   WHEN n.sender_role = 'admin' THEN 'Admin'
                   WHEN n.sender_role = 'provider' THEN 'MyBMC'
                   ELSE 'System'
                 END AS sender_name
               FROM notifications n
               LEFT JOIN complaints c ON n.complaint_id = c.id
               WHERE (
                 n.target_type = 'all'
                 OR (n.target_type = 'specific' AND n.target_user_id = ?)
                 OR n.target_type = ?
               )
               ORDER BY n.created_at DESC 
               LIMIT 100`;

  const [rows] = await db.query(sql, [userId, targetType]);
  return rows;
};

// ═══ Unread count for user ═══
const getUnreadCount = async (userId, role) => {
  const targetType = roleToTarget(role);
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM notifications
     WHERE is_read = 0
       AND (
         target_type = 'all'
         OR (target_type = 'specific' AND target_user_id = ?)
         OR target_type = ?
       )`,
    [userId, targetType]
  );
  return Number(rows[0]?.c) || 0;
};

const markAsRead = async (id, userId, role) => {
  const targetType = roleToTarget(role);
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = ?
       AND (
         target_type = 'all'
         OR (target_type = 'specific' AND target_user_id = ?)
         OR target_type = ?
       )`,
    [id, userId, targetType]
  );
  return result.affectedRows;
};

const markAllAsRead = async (userId, role) => {
  const targetType = roleToTarget(role);
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE is_read = 0
       AND (
         target_type = 'all'
         OR (target_type = 'specific' AND target_user_id = ?)
         OR target_type = ?
       )`,
    [userId, targetType]
  );
  return result.affectedRows;
};

module.exports = { create, getForUser, getUnreadCount, markAsRead, markAllAsRead };