// backend/services/provider.service.js
const providerModel = require('../models/provider.model');
const complaintModel = require('../models/complaint.model');
const notificationModel = require('../models/notification.model');
const { COMPLAINT_STATUS } = require('../config/constants');

// Provider allowed status transitions
const ALLOWED_STATUSES = [
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.RESOLVED
];

// ============ GET ASSIGNED COMPLAINTS ============
const getAssignedComplaints = async (providerId, filters) => {
  return await providerModel.getAssignedComplaints(providerId, filters);
};

// ============ GET ONE ============
const getComplaintDetail = async (complaintId, providerId) => {
  const complaint = await providerModel.getAssignedComplaintById(complaintId, providerId);
  if (!complaint) {
    throw { status: 404, message: 'Complaint not found or not assigned to you' };
  }
  const history = await complaintModel.getStatusHistory(complaintId);
  return { complaint, history };
};

// ============ UPDATE STATUS ============
const updateComplaintStatus = async (complaintId, providerId, status, remarks) => {
  if (!status) throw { status: 400, message: 'Status is required' };
  if (!ALLOWED_STATUSES.includes(status)) {
    throw { status: 400, message: 'You can only set status to "in_progress" or "resolved"' };
  }

  const complaint = await providerModel.getAssignedComplaintById(complaintId, providerId);
  if (!complaint) {
    throw { status: 404, message: 'Complaint not found or not assigned to you' };
  }

  // Prevent re-resolving already resolved
  if (complaint.status === 'resolved' && status === 'resolved') {
    throw { status: 400, message: 'Complaint is already resolved' };
  }

  await providerModel.updateComplaintStatus(complaintId, providerId, status, remarks);

  // Notify citizen
  const title =
    status === 'resolved'
      ? `Complaint ${complaint.complaint_id} marked as Resolved`
      : `Complaint ${complaint.complaint_id} update`;
  const message =
    status === 'resolved'
      ? `Your complaint "${complaint.title}" has been marked as resolved by the service provider.`
      : `Work on your complaint "${complaint.title}" is in progress.`;

  await notificationModel.create({
    title,
    message,
    sender_id: providerId,
    sender_role: 'provider',
    target_type: 'specific',
    target_user_id: complaint.user_id,
    complaint_id: complaintId,
    category: complaint.category
  });

  // Activity log
  await complaintModel.logActivity({
    user_id: providerId,
    user_role: 'provider',
    action: 'complaint_status_changed',
    description: `Provider updated ${complaint.complaint_id} to ${status}`,
    ip_address: null
  });

  return await complaintModel.findById(complaintId);
};

// ============ STATS ============
const getStats = async (providerId) => {
  const stats = await providerModel.getProviderStats(providerId);
  return {
    total_assigned: Number(stats.total_assigned) || 0,
    garbage: Number(stats.garbage) || 0,
    pothole: Number(stats.pothole) || 0,
    others: Number(stats.others) || 0,
    in_progress: Number(stats.in_progress) || 0,
    resolved: Number(stats.resolved) || 0
  };
};

// ============ SEND GENERAL NOTIFICATION ============
const sendGeneralNotification = async (providerId, data) => {
  const { title, message, target_type, category } = data;

  if (!title || !message) {
    throw { status: 400, message: 'Title and message are required' };
  }

  const validTargets = ['all', 'citizen'];
  const target = validTargets.includes(target_type) ? target_type : 'all';

  const notificationId = await notificationModel.create({
    title,
    message,
    sender_id: providerId,
    sender_role: 'provider',
    target_type: target,
    target_user_id: null,
    complaint_id: null,
    category: category || null
  });

  return { id: notificationId, title, message, target_type: target };
};

// ============ GET PROVIDER NOTIFICATIONS ============
const getProviderNotifications = async (providerId) => {
  return await notificationModel.getForUser(providerId, 'provider');
};

module.exports = {
  getAssignedComplaints,
  getComplaintDetail,
  updateComplaintStatus,
  getStats,
  sendGeneralNotification,
  getProviderNotifications
};