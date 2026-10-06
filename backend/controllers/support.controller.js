// backend/controllers/support.controller.js
const supportService = require('../services/support.service');
const { success, error } = require('../utils/response.util');

const create = async (req, res, next) => {
  try {
    const msg = await supportService.createMessage(req.user.id, req.body);
    return success(res, msg, 'Your message has been sent to the support team', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getMy = async (req, res, next) => {
  try {
    const list = await supportService.getMyMessages(req.user.id);
    return success(res, list, 'Messages fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const filters = { status: req.query.status, search: req.query.search };
    const list = await supportService.getAllMessages(filters);
    return success(res, list, 'All messages fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const reply = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid message id', 400);
    const result = await supportService.replyToMessage(id, req.user.id, req.body);
    return success(res, result, 'Reply sent');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { create, getMy, getAll, reply };