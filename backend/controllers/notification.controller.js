// backend/controllers/notification.controller.js
const notificationService = require('../services/notification.service');
const { success, error } = require('../utils/response.util');

const getMy = async (req, res, next) => {
  try {
    const list = await notificationService.getMyNotifications(req.user.id, req.user.role);
    const unread = await notificationService.getUnreadCount(req.user.id, req.user.role);
    return success(res, { notifications: list, unread_count: unread }, 'Notifications fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getUnread = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id, req.user.role);
    return success(res, { unread_count: count }, 'Unread count');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid notification id', 400);
    const result = await notificationService.markAsRead(id, req.user.id, req.user.role);
    return success(res, result, 'Notification marked as read');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id, req.user.role);
    return success(res, result, 'All notifications marked as read');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const sendGeneral = async (req, res, next) => {
  try {
    const result = await notificationService.sendGeneralNotification(req.user.id, req.body);
    return success(res, result, 'Notification sent', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getMy, getUnread, markRead, markAllRead, sendGeneral };