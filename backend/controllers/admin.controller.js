// backend/controllers/admin.controller.js
const adminService = require('../services/admin.service');
const { success, error } = require('../utils/response.util');

const getAllComplaints = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      locality: req.query.locality,
      search: req.query.search,
      limit: req.query.limit
    };
    const complaints = await adminService.getAllComplaints(filters);
    return success(res, complaints, 'Complaints fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getComplaintDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const result = await adminService.getComplaintDetail(id);
    return success(res, result, 'Complaint detail fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const changeStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const { status, remarks } = req.body;
    const complaint = await adminService.changeStatus(id, status, remarks, req.user.id);
    return success(res, complaint, 'Status updated');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const assignProvider = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const { provider_id } = req.body;
    if (!provider_id) return error(res, 'provider_id is required', 400);
    const complaint = await adminService.assignProvider(id, provider_id, req.user.id);
    return success(res, complaint, 'Provider assigned');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      locality: req.query.locality,
      status: req.query.status
    };
    const users = await adminService.getAllUsers(filters);
    return success(res, users, 'Users fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getUserDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid user id', 400);
    const result = await adminService.getUserDetail(id);
    return success(res, result, 'User detail fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getAllProviders = async (req, res, next) => {
  try {
    const providers = await adminService.getAllProviders();
    return success(res, providers, 'Providers fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const toggleProviderStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid provider id', 400);
    const { status } = req.body;
    const result = await adminService.toggleProviderStatus(id, status);
    return success(res, result, 'Provider status updated');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return success(res, stats, 'Stats fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const limit = req.query.limit || 100;
    const logs = await adminService.getActivityLogs(limit);
    return success(res, logs, 'Activity fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const sendUserMessage = async (req, res, next) => {
  try {
    const result = await adminService.sendUserMessage(req.user.id, req.body);
    return success(res, result, 'Message sent successfully', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};
module.exports = {
  getAllComplaints,
  getComplaintDetail,
  changeStatus,
  assignProvider,
  getAllUsers,
  getUserDetail,
  getAllProviders,
  toggleProviderStatus,
  getStats,
  getActivity,
  sendUserMessage   // ⬅️ add karo
};