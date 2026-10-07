// backend/models/chat.model.js
const db = require('../db');

// ═══ SEND MESSAGE ═══
const createMessage = async (data) => {
  const { sender_id, sender_role, receiver_id, receiver_role, message } = data;
  const [result] = await db.query(
    `INSERT INTO chat_messages
      (sender_id, sender_role, receiver_id, receiver_role, message)
     VALUES (?, ?, ?, ?, ?)`,
    [sender_id, sender_role, receiver_id, receiver_role, message]
  );
  return result.insertId;
};

// ═══ GET CONVERSATION (both directions) ═══
const getConversation = async (userId, userRole, otherId, otherRole) => {
  const sql = `
    SELECT 
      cm.id,
      cm.sender_id,
      cm.sender_role,
      cm.receiver_id,
      cm.receiver_role,
      cm.message,
      cm.is_deleted_for_everyone,
      cm.created_at,
      CASE 
        WHEN cm.sender_role = 'admin' 
          THEN (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = cm.sender_id)
        WHEN cm.sender_role = 'provider' 
          THEN (SELECT name FROM service_providers WHERE id = cm.sender_id)
      END AS sender_name
    FROM chat_messages cm
    WHERE (
      (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
      OR
      (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
    )
    AND cm.id NOT IN (
      SELECT message_id FROM chat_message_deletions
      WHERE deleted_by_id = ? AND deleted_by_role = ?
    )
    ORDER BY cm.created_at ASC
    LIMIT 500
  `;
  const params = [
    userId, userRole, otherId, otherRole,
    otherId, otherRole, userId, userRole,
    userId, userRole
  ];
  const [rows] = await db.query(sql, params);
  return rows;
};

// ═══ GET MESSAGES SINCE (for polling) ═══
const getMessagesSince = async (userId, userRole, otherId, otherRole, sinceId) => {
  const sql = `
    SELECT 
      cm.id, cm.sender_id, cm.sender_role, cm.receiver_id, cm.receiver_role,
      cm.message, cm.is_deleted_for_everyone, cm.created_at,
      CASE 
        WHEN cm.sender_role = 'admin' 
          THEN (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = cm.sender_id)
        WHEN cm.sender_role = 'provider' 
          THEN (SELECT name FROM service_providers WHERE id = cm.sender_id)
      END AS sender_name
    FROM chat_messages cm
    WHERE cm.id > ?
      AND (
        (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
        OR
        (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
      )
    ORDER BY cm.created_at ASC
    LIMIT 100
  `;
  const params = [
    sinceId,
    userId, userRole, otherId, otherRole,
    otherId, otherRole, userId, userRole
  ];
  const [rows] = await db.query(sql, params);
  return rows;
};

// ═══ DELETE FOR ME ═══
const deleteForMe = async (messageId, userId, userRole) => {
  // Check if message exists
  const [rows] = await db.query('SELECT id FROM chat_messages WHERE id = ?', [messageId]);
  if (rows.length === 0) return false;

  await db.query(
    `INSERT IGNORE INTO chat_message_deletions (message_id, deleted_by_id, deleted_by_role)
     VALUES (?, ?, ?)`,
    [messageId, userId, userRole]
  );
  return true;
};

// ═══ DELETE FOR EVERYONE ═══
const deleteForEveryone = async (messageId, userId, userRole) => {
  const [rows] = await db.query(
    'SELECT sender_id, sender_role FROM chat_messages WHERE id = ?',
    [messageId]
  );
  if (rows.length === 0) return false;
  if (rows[0].sender_id !== userId || rows[0].sender_role !== userRole) return false;

  await db.query(
    'UPDATE chat_messages SET is_deleted_for_everyone = 1, message = "This message was deleted" WHERE id = ?',
    [messageId]
  );
  return true;
};

// ═══ UNREAD COUNT ═══
const getUnreadCount = async (userId, userRole) => {
  // Get latest read position — for simplicity, count messages received after the last message sent by this user
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM chat_messages
     WHERE receiver_id = ? AND receiver_role = ?
       AND is_deleted_for_everyone = 0
       AND created_at > COALESCE(
         (SELECT MAX(created_at) FROM chat_messages 
          WHERE sender_id = ? AND sender_role = ?), 
         '1970-01-01'
       )`,
    [userId, userRole, userId, userRole]
  );
  return Number(rows[0]?.cnt) || 0;
};

// ═══ GET LAST MESSAGE ═══
const getLastMessage = async (userId, userRole, otherId, otherRole) => {
  const [rows] = await db.query(
    `SELECT cm.id, cm.message, cm.sender_role, cm.is_deleted_for_everyone, cm.created_at
     FROM chat_messages cm
     WHERE (
       (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
       OR
       (cm.sender_id = ? AND cm.sender_role = ? AND cm.receiver_id = ? AND cm.receiver_role = ?)
     )
     AND cm.id NOT IN (
       SELECT message_id FROM chat_message_deletions
       WHERE deleted_by_id = ? AND deleted_by_role = ?
     )
     ORDER BY cm.created_at DESC LIMIT 1`,
    [userId, userRole, otherId, otherRole, otherId, otherRole, userId, userRole, userId, userRole]
  );
  return rows[0] || null;
};

// ═══ CHECK ONLINE STATUS ═══
const isUserOnline = async (userId, userRole) => {
  const table = userRole === 'admin' ? 'users' : 'service_providers';
  const [rows] = await db.query(
    `SELECT last_seen FROM ${table} WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) return false;
  const lastSeen = rows[0].last_seen;
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 2 * 60 * 1000; // Online if active within 2 minutes
};

module.exports = {
  createMessage,
  getConversation,
  getMessagesSince,
  deleteForMe,
  deleteForEveryone,
  getUnreadCount,
  getLastMessage,
  isUserOnline
};