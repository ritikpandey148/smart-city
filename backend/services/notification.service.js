// backend/services/notification.service.js
const notificationModel = require('../models/notification.model');

// Get notifications for logged-in user (citizen or provider)
const getMyNotifications = async (userId, role) => {
  return await notificationModel.getForUser(userId, role);
};

// Mark notification read
const markAsRead = async (notificationId, userId, role) => {
  await notificationModel.markAsRead(notificationId);
  return { id: notificationId, is_read: 1 };
};

// Admin send general notification
const sendGeneralNotification = async (adminId, data) => {
  const { title, message, target_type, category } = data;

  if (!title || !message) {
    throw { status: 400, message: 'Title and message are required' };
  }

  const validTargets = ['all', 'citizen', 'provider'];
  const target = validTargets.includes(target_type) ? target_type : 'all';

  const id = await notificationModel.create({
    title,
    message,
    sender_id: adminId,
    sender_role: 'admin',
    target_type: target,
    target_user_id: null,
    complaint_id: null,
    category: category || null
  });

  return { id, title, message, target_type: target };
};

module.exports = { getMyNotifications, markAsRead, sendGeneralNotification };