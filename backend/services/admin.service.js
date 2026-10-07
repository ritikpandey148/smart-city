// backend/services/admin.service.js
const adminModel = require('../models/admin.model');
const complaintModel = require('../models/complaint.model');
const notificationModel = require('../models/notification.model');
const { COMPLAINT_STATUS } = require('../config/constants');

const VALID_STATUSES = Object.values(COMPLAINT_STATUS);

// ============ COMPLAINTS ============
const getAllComplaints = async (filters) => {
  return await adminModel.getAllComplaints(filters);
};

const getComplaintDetail = async (id) => {
  const complaint = await complaintModel.findById(id);
  if (!complaint) throw { status: 404, message: 'Complaint not found' };
  const history = await complaintModel.getStatusHistory(id);
  return { complaint, history };
};

const changeStatus = async (id, status, remarks, adminId) => {
  if (!VALID_STATUSES.includes(status)) {
    throw { status: 400, message: 'Invalid status' };
  }
  const complaint = await complaintModel.findById(id);
  if (!complaint) throw { status: 404, message: 'Complaint not found' };

  await adminModel.updateComplaintStatus(id, status, remarks, adminId);

  // Notify the citizen
  await notificationModel.create({
    title: `Complaint ${complaint.complaint_id} updated`,
    message: `Your complaint "${complaint.title}" status changed to ${status.replace('_', ' ')}.`,
    sender_id: adminId,
    sender_role: 'admin',
    target_type: 'specific',
    target_user_id: complaint.user_id,
    complaint_id: id,
    category: complaint.category
  });

  // Log activity
  await complaintModel.logActivity({
    user_id: adminId,
    user_role: 'admin',
    action: 'complaint_status_changed',
    description: `Complaint ${complaint.complaint_id} → ${status}`,
    ip_address: null
  });

  return await complaintModel.findById(id);
};

const assignProvider = async (complaintId, providerId, adminId) => {
  const complaint = await complaintModel.findById(complaintId);
  if (!complaint) throw { status: 404, message: 'Complaint not found' };

  // Verify provider exists
  const db = require('../db');
  const [provRows] = await db.query(
    'SELECT id, name FROM service_providers WHERE id = ? AND account_status = "active" LIMIT 1',
    [providerId]
  );
  if (provRows.length === 0) {
    throw { status: 404, message: 'Provider not found or inactive' };
  }

  await adminModel.assignProvider(complaintId, providerId, adminId);

  // Notify citizen
  await notificationModel.create({
    title: `Complaint ${complaint.complaint_id} in progress`,
    message: `Your complaint "${complaint.title}" has been assigned to ${provRows[0].name}. Work will begin soon.`,
    sender_id: adminId,
    sender_role: 'admin',
    target_type: 'specific',
    target_user_id: complaint.user_id,
    complaint_id: complaintId,
    category: complaint.category
  });

  // Log
  await complaintModel.logActivity({
    user_id: adminId,
    user_role: 'admin',
    action: 'complaint_assigned',
    description: `Complaint ${complaint.complaint_id} assigned to ${provRows[0].name}`,
    ip_address: null
  });

  return await complaintModel.findById(complaintId);
};

// ============ USERS ============
const getAllUsers = async (filters) => adminModel.getAllUsers(filters);

const getUserDetail = async (userId) => {
  const user = await adminModel.getUserDetail(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  const complaints = await adminModel.getUserComplaints(userId);

  // Compute summary
  const summary = {
    total: complaints.length,
    garbage: complaints.filter(c => c.category === 'garbage').length,
    pothole: complaints.filter(c => c.category === 'pothole').length,
    others: complaints.filter(c => c.category === 'others').length,
    submitted: complaints.filter(c => c.status === 'submitted').length,
    in_review: complaints.filter(c => c.status === 'in_review').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  return { user, summary, complaints };
};

// ============ PROVIDERS ============
const getAllProviders = async () => adminModel.getAllProviders();

const toggleProviderStatus = async (id, status) => {
  if (!['active', 'inactive'].includes(status)) {
    throw { status: 400, message: 'Invalid status' };
  }
  await adminModel.updateProviderStatus(id, status);
  return { id, account_status: status };
};

// ============ STATS ============
const getDashboardStats = async () => {
  const stats = await adminModel.getDashboardStats();
  // Convert to numbers
  const result = {};
  Object.keys(stats).forEach(k => { result[k] = Number(stats[k]) || 0; });
  return result;
};

const getActivityLogs = async (limit) => adminModel.getActivityLogs(limit);

// ═══ SEND MESSAGE TO INDIVIDUAL USER ═══
const sendUserMessage = async (adminId, data) => {
  const { user_id, title, message } = data;

  if (!user_id) throw { status: 400, message: 'User ID is required' };
  if (!title || title.trim().length < 3) {
    throw { status: 400, message: 'Title must be at least 3 characters' };
  }
  if (!message || message.trim().length < 5) {
    throw { status: 400, message: 'Message must be at least 5 characters' };
  }

  // Verify user exists
  const user = await adminModel.getUserDetail(user_id);
  if (!user) throw { status: 404, message: 'User not found' };

  // Send notification (specific to this user)
  const notificationModel = require('../models/notification.model');
  const id = await notificationModel.create({
    title: title.trim(),
    message: message.trim(),
    sender_id: adminId,
    sender_role: 'admin',
    target_type: 'specific',
    target_user_id: user_id,
    complaint_id: null,
    category: 'message'
  });

  // Activity log
  const db = require('../db');
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, 'admin', 'user_message_sent', ?, NULL)`,
    [adminId, `Sent message to user #${user_id}: "${title.trim().substring(0, 80)}"`]
  );

  return { id, user_id, title: title.trim(), message: message.trim() };
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
  getDashboardStats,
  getActivityLogs,
  sendUserMessage   // ⬅️ add karo
};