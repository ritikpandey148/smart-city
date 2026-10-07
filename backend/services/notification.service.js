// backend/services/notification.service.js
const notificationModel = require('../models/notification.model');

const getMyNotifications = async (userId, role) => {
  return await notificationModel.getForUser(userId, role);
};

const getUnreadCount = async (userId, role) => {
  return await notificationModel.getUnreadCount(userId, role);
};

const markAsRead = async (notificationId, userId, role) => {
  const affected = await notificationModel.markAsRead(notificationId, userId, role);
  return { id: notificationId, updated: affected };
};

const markAllAsRead = async (userId, role) => {
  const affected = await notificationModel.markAllAsRead(userId, role);
  return { updated: affected };
};

const sendGeneralNotification = async (adminId, data) => {
  const { title, message, target_type, category } = data;
  if (!title || !message) throw { status: 400, message: 'Title and message are required' };

  const validTargets = ['all', 'citizen', 'provider'];
  const target = validTargets.includes(target_type) ? target_type : 'all';

  const id = await notificationModel.create({
    title, message,
    sender_id: adminId,
    sender_role: 'admin',
    target_type: target,
    target_user_id: null,
    complaint_id: null,
    category: category || null
  });

  return { id, title, message, target_type: target };
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendGeneralNotification
};