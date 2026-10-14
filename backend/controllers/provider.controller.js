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
    const complaints = await providerService.getComplaints(req.user.id, filters);
    return success(res, complaints, 'Complaints fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getComplaint = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const result = await providerService.getComplaintDetail(id);
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

const getUsers = async (req, res, next) => {
  try {
    const list = await providerService.getMyUsers(req.user.id);
    return success(res, list, 'Users fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getAdmin = async (req, res, next) => {
  try {
    const admin = await providerService.getAdminInfo();
    return success(res, admin, 'Admin info fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const sendUserMessage = async (req, res, next) => {
  try {
    const result = await providerService.sendUserMessage(req.user.id, req.body);
    return success(res, result, 'Message sent successfully', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getAdminActivity = async (req, res, next) => {
  try {
    const list = await providerService.getAdminActivity();
    return success(res, list, 'Admin activity fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getWorkStats = async (req, res, next) => {
  try {
    const stats = await providerService.getWorkStats(req.user.id);
    return success(res, stats, 'Work stats fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getRecentUpdates = async (req, res, next) => {
  try {
    const list = await providerService.getRecentUpdates(req.user.id);
    return success(res, list, 'Recent updates fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const lookupComplaint = async (req, res, next) => {
  try {
    const cid = req.params.cid;
    if (!cid) return error(res, 'Complaint ID required', 400);
    const complaint = await providerService.lookupComplaintByCid(cid);
    return success(res, complaint, 'Complaint found');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const updateStatusByCid = async (req, res, next) => {
  try {
    const { complaint_id, status, remarks } = req.body;
    if (!complaint_id) return error(res, 'Complaint ID required', 400);
    const result = await providerService.updateStatusByCid(complaint_id, req.user.id, status, remarks);
    return success(res, result, 'Status updated and user notified', 200);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const provider = await providerService.updateProfile(req.user.id, req.body);
    return success(res, provider, 'Profile updated successfully');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const changeUsername = async (req, res, next) => {
  try {
    const { current_password, new_username } = req.body;
    const provider = await providerService.changeUsername(req.user.id, current_password, new_username);
    return success(res, provider, 'Username updated successfully');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await providerService.changePassword(req.user.id, current_password, new_password);
    return success(res, result, 'Password changed successfully');
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
  getNotifications,
  getUsers,
  getAdmin,
  sendUserMessage,
  getAdminActivity,
  getWorkStats,
  getRecentUpdates,
  lookupComplaint,
  updateStatusByCid,
  updateProfile,      // ⬅️ NEW
  changeUsername,     // ⬅️ NEW
  changePassword      // ⬅️ NEW
};