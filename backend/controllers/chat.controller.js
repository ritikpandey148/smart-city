// backend/controllers/chat.controller.js
const chatService = require('../services/chat.service');
const { success, error } = require('../utils/response.util');

const send = async (req, res, next) => {
  try {
    const result = await chatService.sendMessage(req.user.id, req.user.role, req.body);
    return success(res, result, 'Message sent', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const otherId = parseInt(req.params.otherId, 10);
    const otherRole = req.params.otherRole;
    if (isNaN(otherId)) return error(res, 'Invalid receiver id', 400);
    const result = await chatService.getConversation(req.user.id, req.user.role, otherId, otherRole);
    return success(res, result, 'Conversation fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const poll = async (req, res, next) => {
  try {
    const otherId = parseInt(req.params.otherId, 10);
    const otherRole = req.params.otherRole;
    const sinceId = req.query.since || 0;
    if (isNaN(otherId)) return error(res, 'Invalid receiver id', 400);
    const result = await chatService.pollMessages(req.user.id, req.user.role, otherId, otherRole, sinceId);
    return success(res, result, 'New messages');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const deleteMsg = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const scope = req.query.scope === 'everyone' ? 'everyone' : 'me';
    if (isNaN(id)) return error(res, 'Invalid message id', 400);
    const result = await chatService.deleteMessage(id, req.user.id, req.user.role, scope);
    return success(res, result, 'Message deleted');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const unread = async (req, res, next) => {
  try {
    const count = await chatService.getUnreadCount(req.user.id, req.user.role);
    return success(res, { unread_count: count }, 'Unread count');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const lastMessage = async (req, res, next) => {
  try {
    const otherId = parseInt(req.params.otherId, 10);
    const otherRole = req.params.otherRole;
    if (isNaN(otherId)) return error(res, 'Invalid receiver id', 400);
    const result = await chatService.getLastMessage(req.user.id, req.user.role, otherId, otherRole);
    return success(res, result, 'Last message fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { send, getConversation, poll, deleteMsg, unread, lastMessage };