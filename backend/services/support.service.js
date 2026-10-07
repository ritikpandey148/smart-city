// backend/services/support.service.js
const supportModel = require('../models/support.model');
const notificationModel = require('../models/notification.model');
const db = require('../db');

// ═══ CREATE SUPPORT MESSAGE ═══
const createMessage = async (userId, data) => {
  const { subject, message } = data;

  if (!subject || subject.trim().length < 3) {
    throw { status: 400, message: 'Subject must be at least 3 characters' };
  }
  if (!message || message.trim().length < 10) {
    throw { status: 400, message: 'Message must be at least 10 characters' };
  }
  if (subject.length > 150) {
    throw { status: 400, message: 'Subject must be 150 characters or less' };
  }
  if (message.length > 2000) {
    throw { status: 400, message: 'Message must be 2000 characters or less' };
  }

  // Insert
  const id = await supportModel.create({
    user_id: userId,
    subject: subject.trim(),
    message: message.trim()
  });

  // Get user details for notification
  const [userRows] = await db.query(
    'SELECT first_name, last_name, username FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = userRows[0] || { first_name: 'User', last_name: '', username: '' };
  const userName = `${user.first_name} ${user.last_name}`.trim() || user.username;

    // Notify ALL providers (broadcast)
  await notificationModel.create({
    title: `New Support Request from ${userName}`,
    message: `Subject: ${subject.trim().substring(0, 100)}`,
    sender_id: userId,
    sender_role: 'system',
    target_type: 'provider',
    target_user_id: null,
    complaint_id: null,
    category: 'support'
  });

  // Notify Admin as well
  await notificationModel.create({
    title: `New Support Request from ${userName}`,
    message: `Subject: ${subject.trim().substring(0, 100)}`,
    sender_id: userId,
    sender_role: 'system',
    target_type: 'admin',
    target_user_id: null,
    complaint_id: null,
    category: 'support'
  });

  // Activity log (Admin will see this)
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, 'citizen', 'support_message_sent', ?, NULL)`,
    [userId, `Support message #${id}: "${subject.trim().substring(0, 80)}"`]
  );

  return await supportModel.findById(id);
};

// ═══ GET USER'S MESSAGES ═══
const getMyMessages = async (userId) => {
  return await supportModel.getByUserId(userId);
};

// ═══ GET ALL (admin) ═══
const getAllMessages = async (filters) => {
  return await supportModel.getAll(filters);
};

// ═══ ADMIN REPLY ═══
const replyToMessage = async (id, adminId, data) => {
  const { status, admin_reply } = data;

  const existing = await supportModel.findById(id);
  if (!existing) throw { status: 404, message: 'Support message not found' };

  const validStatuses = ['open', 'in_progress', 'resolved'];
  const finalStatus = validStatuses.includes(status) ? status : existing.status;

  await supportModel.updateStatus(id, finalStatus, admin_reply, adminId);

  // Notify the citizen
  await notificationModel.create({
    title: `Reply from Support Team`,
    message: admin_reply || `Your support ticket has been updated to "${finalStatus}".`,
    sender_id: adminId,
    sender_role: 'admin',
    target_type: 'specific',
    target_user_id: existing.user_id,
    complaint_id: null,
    category: 'support'
  });

  // Log
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, 'admin', 'support_reply_sent', ?, NULL)`,
    [adminId, `Replied to support message #${id}`]
  );

  return await supportModel.findById(id);
};

module.exports = {
  createMessage,
  getMyMessages,
  getAllMessages,
  replyToMessage
};