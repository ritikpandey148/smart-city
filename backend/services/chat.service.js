// backend/services/chat.service.js
const chatModel = require('../models/chat.model');
const notificationModel = require('../models/notification.model');
const db = require('../db');

// ═══ SEND MESSAGE ═══
const sendMessage = async (senderId, senderRole, data) => {
  const { receiver_id, receiver_role, message } = data;

  if (!receiver_id || !receiver_role) {
    throw { status: 400, message: 'Receiver is required' };
  }
  if (!message || !message.trim()) {
    throw { status: 400, message: 'Message cannot be empty' };
  }
  if (message.length > 2000) {
    throw { status: 400, message: 'Message too long (max 2000 chars)' };
  }

  const id = await chatModel.createMessage({
    sender_id: senderId,
    sender_role: senderRole,
    receiver_id: receiver_id,
    receiver_role: receiver_role,
    message: message.trim()
  });

  // Check if receiver is online
  const isOnline = await chatModel.isUserOnline(receiver_id, receiver_role);

  if (!isOnline) {
    // Send notification to receiver
    let senderName = 'Admin';
    if (senderRole === 'provider') {
      const [pRows] = await db.query('SELECT name FROM service_providers WHERE id = ?', [senderId]);
      senderName = pRows[0]?.name || 'Service Provider';
    } else {
      const [uRows] = await db.query('SELECT first_name, last_name FROM users WHERE id = ?', [senderId]);
      senderName = uRows[0] ? `${uRows[0].first_name} ${uRows[0].last_name}` : 'Admin';
    }

    const title = `New message from ${senderName}`;
    const preview = message.trim().substring(0, 100);

    await notificationModel.create({
      title: title,
      message: preview,
      sender_id: senderId,
      sender_role: senderRole,
      target_type: receiver_role === 'admin' ? 'admin' : 'provider',
      target_user_id: null,
      complaint_id: null,
      category: 'chat'
    });
  }

  // Fetch the just-inserted message to return
  const [rows] = await db.query(
    `SELECT id, sender_id, sender_role, receiver_id, receiver_role, message, created_at
     FROM chat_messages WHERE id = ?`,
    [id]
  );

  return {
    message: rows[0],
    receiver_online: isOnline,
    notification_sent: !isOnline
  };
};

// ═══ GET CONVERSATION ═══
const getConversation = async (userId, userRole, otherId, otherRole) => {
  const messages = await chatModel.getConversation(userId, userRole, otherId, otherRole);
  const otherOnline = await chatModel.isUserOnline(otherId, otherRole);
  return { messages, other_online: otherOnline };
};

// ═══ POLL FOR NEW MESSAGES ═══
const pollMessages = async (userId, userRole, otherId, otherRole, sinceId) => {
  const since = parseInt(sinceId, 10) || 0;
  const messages = await chatModel.getMessagesSince(userId, userRole, otherId, otherRole, since);
  const otherOnline = await chatModel.isUserOnline(otherId, otherRole);
  return { messages, other_online: otherOnline };
};

// ═══ DELETE ═══
const deleteMessage = async (messageId, userId, userRole, scope) => {
  if (scope === 'everyone') {
    const ok = await chatModel.deleteForEveryone(messageId, userId, userRole);
    if (!ok) throw { status: 403, message: 'You can only delete your own messages for everyone' };
  } else {
    const ok = await chatModel.deleteForMe(messageId, userId, userRole);
    if (!ok) throw { status: 404, message: 'Message not found' };
  }
  return { id: messageId, scope };
};

// ═══ UNREAD ═══
const getUnreadCount = async (userId, userRole) => {
  return await chatModel.getUnreadCount(userId, userRole);
};

// ═══ LAST MESSAGE ═══
const getLastMessage = async (userId, userRole, otherId, otherRole) => {
  return await chatModel.getLastMessage(userId, userRole, otherId, otherRole);
};

module.exports = {
  sendMessage,
  getConversation,
  pollMessages,
  deleteMessage,
  getUnreadCount,
  getLastMessage
};