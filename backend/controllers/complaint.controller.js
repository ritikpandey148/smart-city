// backend/controllers/complaint.controller.js
const complaintService = require('../services/complaint.service');
const { success, error } = require('../utils/response.util');

const create = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const complaint = await complaintService.createComplaint(
      req.user.id, req.body, req.file, ip
    );
    return success(res, complaint, 'Complaint submitted successfully', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getMy = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status
    };
    const complaints = await complaintService.getMyComplaints(req.user.id, filters);
    return success(res, complaints, 'Complaints fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const complaint = await complaintService.getComplaintById(id, req.user.id, req.user.role);
    return success(res, complaint, 'Complaint fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return error(res, 'Invalid complaint id', 400);
    const history = await complaintService.getComplaintHistory(id, req.user.id, req.user.role);
    return success(res, history, 'History fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await complaintService.getMyStats(req.user.id);
    return success(res, stats, 'Stats fetched');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    next(err);
  }
};

module.exports = { create, getMy, getOne, getHistory, getStats };