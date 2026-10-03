// backend/controllers/provider.controller.js
const providerService = require('../services/provider.service');
const { success, error } = require('../utils/response.util');

const getComplaints = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search
    };
    const complaints = await providerService.getAssignedComplaints(req.user.id, filters);
    return success(res, complaints, 'Assigned complaints fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getComplaint = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const result = await providerService.getComplaintDetail(id, req.user.id);
    return success(res, result, 'Complaint detail fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const { status, remarks } = req.body;
    const complaint = await providerService.updateComplaintStatus(
      id, req.user.id, status, remarks
    );
    return success(res, complaint, 'Status updated');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await providerService.getStats(req.user.id);
    return success(res, stats, 'Stats fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const sendNotification = async (req, res, next) => {
  try {
    const result = await providerService.sendGeneralNotification(req.user.id, req.body);
    return success(res, result, 'Notification sent', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const list = await providerService.getProviderNotifications(req.user.id);
    return success(res, list, 'Notifications fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = {
  getComplaints,
  getComplaint,
  updateStatus,
  getStats,
  sendNotification,
  getNotifications
};