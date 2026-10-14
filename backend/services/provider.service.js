// backend/services/provider.service.js
const providerModel = require('../models/provider.model');
const complaintModel = require('../models/complaint.model');
const notificationModel = require('../models/notification.model');
const { COMPLAINT_STATUS } = require('../config/constants');

const ALLOWED_STATUSES = [
  COMPLAINT_STATUS.SUBMITTED,
  COMPLAINT_STATUS.IN_REVIEW,
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.RESOLVED
];

// ═══ GET ALL COMPLAINTS ═══
const getComplaints = async (providerId, filters) => {
  return await providerModel.getAllComplaints(filters);
};

// ═══ GET ONE ═══
const getComplaintDetail = async (complaintId) => {
  const complaint = await providerModel.getComplaintById(complaintId);
  if (!complaint) {
    throw { status: 404, message: 'Complaint not found' };
  }
  const history = await complaintModel.getStatusHistory(complaintId);
  return { complaint, history };
};

// ═══ UPDATE STATUS ═══
const updateComplaintStatus = async (complaintId, providerId, status, remarks) => {
  if (!status) throw { status: 400, message: 'Status is required' };
  if (!ALLOWED_STATUSES.includes(status)) {
    throw { status: 400, message: 'Invalid status value' };
  }

  const complaint = await providerModel.getComplaintById(complaintId);
  if (!complaint) {
    throw { status: 404, message: 'Complaint not found' };
  }

  if (complaint.status === status) {
    throw { status: 400, message: `Complaint is already "${status.replace('_',' ')}"` };
  }

  await providerModel.updateComplaintStatus(complaintId, providerId, status, remarks);

  // ═══ Notify user ═══
  const statusLabels = {
    submitted: 'Submitted',
    in_review: 'In Review',
    in_progress: 'In Progress',
    resolved: 'Resolved'
  };

  const title = `Complaint ${complaint.complaint_id} — ${statusLabels[status]}`;
  const message = status === 'resolved'
    ? `Your complaint "${complaint.title}" has been marked as Resolved by the service provider.`
    : status === 'in_progress'
      ? `Work on your complaint "${complaint.title}" is in progress.`
      : status === 'in_review'
        ? `Your complaint "${complaint.title}" is now under review.`
        : `Your complaint "${complaint.title}" status changed to ${statusLabels[status]}.`;

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
    description: `Provider updated ${complaint.complaint_id} → ${status}`,
    ip_address: null
  });

  return await providerModel.getComplaintById(complaintId);
};

// ═══ STATS ═══
const getStats = async (providerId) => {
  const s = await providerModel.getProviderStats();
  return {
    total_assigned: Number(s.total_assigned) || 0,
    garbage: Number(s.garbage) || 0,
    pothole: Number(s.pothole) || 0,
    others: Number(s.others) || 0,
    submitted: Number(s.submitted) || 0,
    in_review: Number(s.in_review) || 0,
    in_progress: Number(s.in_progress) || 0,
    resolved: Number(s.resolved) || 0
  };
};

// ═══ SEND GENERAL NOTIFICATION ═══
const sendGeneralNotification = async (providerId, data) => {
  const { title, message, target_type, category } = data;

  if (!title || !message) {
    throw { status: 400, message: 'Title and message are required' };
  }

  const validTargets = ['all', 'citizen', 'admin'];
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

// ═══ GET NOTIFICATIONS ═══
const getProviderNotifications = async (providerId) => {
  return await notificationModel.getForUser(providerId, 'provider');
};

// ═══ GET USERS ═══
const getMyUsers = async (providerId) => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT DISTINCT
       u.id, u.first_name, u.last_name, u.username, u.mobile,
       u.locality, u.pincode, u.created_at, u.last_seen,
       (SELECT COUNT(*) FROM complaints WHERE user_id = u.id) AS complaint_count,
       (SELECT COUNT(*) FROM complaints WHERE user_id = u.id AND status = 'resolved') AS resolved_count
     FROM users u
     INNER JOIN complaints c ON c.user_id = u.id
     WHERE u.role = 'citizen'
     ORDER BY complaint_count DESC, u.first_name ASC`
  );

  return rows.map(r => ({
    ...r,
    complaint_count: Number(r.complaint_count) || 0,
    resolved_count: Number(r.resolved_count) || 0
  }));
};

// ═══ GET ADMIN INFO ═══
const getAdminInfo = async () => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT id, first_name, last_name, username, mobile, created_at, last_seen
     FROM users WHERE role = 'admin' LIMIT 1`
  );
  return rows[0] || null;
};

// ═══ SEND MESSAGE TO INDIVIDUAL USER ═══
const sendUserMessage = async (providerId, data) => {
  const { user_id, title, message } = data;

  if (!user_id) throw { status: 400, message: 'User ID is required' };
  if (!title || title.trim().length < 3) {
    throw { status: 400, message: 'Title must be at least 3 characters' };
  }
  if (!message || message.trim().length < 5) {
    throw { status: 400, message: 'Message must be at least 5 characters' };
  }

  // Verify user exists
  const db = require('../db');
  const [userRows] = await db.query(
    'SELECT id, first_name, last_name, username FROM users WHERE id = ? AND role = "citizen" LIMIT 1',
    [user_id]
  );
  if (userRows.length === 0) throw { status: 404, message: 'User not found' };

  // Send notification (specific to this user)
  const notificationModel = require('../models/notification.model');
  const id = await notificationModel.create({
    title: title.trim(),
    message: message.trim(),
    sender_id: providerId,
    sender_role: 'provider',
    target_type: 'specific',
    target_user_id: user_id,
    complaint_id: null,
    category: 'message'
  });

  // Activity log
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, 'provider', 'user_message_sent', ?, NULL)`,
    [providerId, `myBMC sent message to user #${user_id}: "${title.trim().substring(0, 80)}"`]
  );

  return { id, user_id, title: title.trim(), message: message.trim() };
};

// ═══ GET ADMIN ACTIVITY (status changes done by admin) ═══
const getAdminActivity = async () => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT 
       h.id, h.status, h.remarks, h.created_at,
       c.id AS complaint_id_db,
       c.complaint_id AS complaint_ref,
       c.title AS complaint_title,
       c.category AS complaint_category,
       c.locality AS complaint_locality,
       c.status AS current_status,
       u.first_name AS admin_first, u.last_name AS admin_last, u.username AS admin_username
     FROM complaint_status_history h
     INNER JOIN complaints c ON h.complaint_id = c.id
     LEFT JOIN users u ON h.changed_by_id = u.id AND h.changed_by_role = 'admin'
     WHERE h.changed_by_role = 'admin'
     ORDER BY h.created_at DESC
     LIMIT 50`
  );
  return rows;
}; 

// ═══ GET WORK STATS ═══
const getWorkStats = async (providerId) => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
       SUM(CASE WHEN category = 'garbage' THEN 1 ELSE 0 END) AS garbage,
       SUM(CASE WHEN category = 'pothole' THEN 1 ELSE 0 END) AS pothole,
       SUM(CASE WHEN category = 'others' THEN 1 ELSE 0 END) AS others,
       SUM(CASE WHEN DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) AS updated_today,
       SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS last_7_days,
       SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last_30_days,
       SUM(CASE WHEN resolved_at IS NOT NULL AND DATE(resolved_at) = CURDATE() THEN 1 ELSE 0 END) AS resolved_today
     FROM complaints`
  );

  const s = rows[0];

  // Last 7 days activity (day by day)
  const [activityRows] = await db.query(
    `SELECT 
       DATE(created_at) AS date,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
       SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
     FROM complaint_status_history
     WHERE changed_by_role = 'provider'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  return {
    total: Number(s.total) || 0,
    resolved: Number(s.resolved) || 0,
    in_progress: Number(s.in_progress) || 0,
    in_review: Number(s.in_review) || 0,
    submitted: Number(s.submitted) || 0,
    garbage: Number(s.garbage) || 0,
    pothole: Number(s.pothole) || 0,
    others: Number(s.others) || 0,
    updated_today: Number(s.updated_today) || 0,
    last_7_days: Number(s.last_7_days) || 0,
    last_30_days: Number(s.last_30_days) || 0,
    resolved_today: Number(s.resolved_today) || 0,
    activity_last_7_days: activityRows
  };
};

// ═══ GET RECENT UPDATES (by provider) ═══
const getRecentUpdates = async (providerId) => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT 
       h.id, h.status, h.remarks, h.created_at,
       c.id AS complaint_id_db,
       c.complaint_id AS complaint_ref,
       c.title AS complaint_title,
       c.category AS complaint_category,
       c.locality,
       u.first_name, u.last_name, u.username
     FROM complaint_status_history h
     INNER JOIN complaints c ON h.complaint_id = c.id
     LEFT JOIN users u ON c.user_id = u.id
     WHERE h.changed_by_role = 'provider'
     ORDER BY h.created_at DESC
     LIMIT 20`
  );
  return rows;
};

// ═══ LOOKUP COMPLAINT BY COMPLAINT_ID (string) ═══
const lookupComplaintByCid = async (complaintId) => {
  const db = require('../db');
  const [rows] = await db.query(
    `SELECT 
       c.id, c.complaint_id, c.title, c.category, c.status,
       c.locality, c.pincode, c.description, c.image_path,
       c.submitted_at, c.updated_at,
       u.first_name, u.last_name, u.username, u.mobile
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.complaint_id = ? LIMIT 1`,
    [complaintId.toUpperCase()]
  );
  if (rows.length === 0) {
    throw { status: 404, message: 'Complaint not found. Please check the Complaint ID.' };
  }
  return rows[0];
};

// ═══ UPDATE STATUS BY COMPLAINT_ID (string) ═══
const updateStatusByCid = async (complaintId, providerId, status, remarks) => {
  const db = require('../db');
  const validStatuses = ['submitted', 'in_review', 'in_progress', 'resolved'];
  if (!validStatuses.includes(status)) {
    throw { status: 400, message: 'Invalid status value' };
  }

  // Get complaint + user_id
  const [rows] = await db.query(
    'SELECT id, user_id, complaint_id, title, category, status FROM complaints WHERE complaint_id = ? LIMIT 1',
    [complaintId.toUpperCase()]
  );
  if (rows.length === 0) {
    throw { status: 404, message: 'Complaint not found. Please check the Complaint ID.' };
  }
  const c = rows[0];

  if (c.status === status) {
    throw { status: 400, message: `Complaint is already "${status.replace('_', ' ')}"` };
  }

  // Update status
  await db.query(
    `UPDATE complaints 
     SET status = ?, resolved_at = ${status === 'resolved' ? 'NOW()' : 'resolved_at'}
     WHERE id = ?`,
    [status, c.id]
  );

  // History
  await db.query(
    `INSERT INTO complaint_status_history 
      (complaint_id, status, changed_by_id, changed_by_role, remarks)
     VALUES (?, ?, ?, 'provider', ?)`,
    [c.id, status, providerId, remarks || null]
  );

  // Notify user
  const notificationModel = require('../models/notification.model');
  const labels = { submitted: 'Submitted', in_review: 'In Review', in_progress: 'In Progress', resolved: 'Resolved' };
  await notificationModel.create({
    title: `Complaint ${c.complaint_id} — ${labels[status]}`,
    message: status === 'resolved'
      ? `Your complaint "${c.title}" has been marked as Resolved by the service provider.`
      : status === 'in_progress'
        ? `Work on your complaint "${c.title}" is in progress.`
        : status === 'in_review'
          ? `Your complaint "${c.title}" is now under review.`
          : `Your complaint "${c.title}" status changed to ${labels[status]}.`,
    sender_id: providerId,
    sender_role: 'provider',
    target_type: 'specific',
    target_user_id: c.user_id,
    complaint_id: c.id,
    category: c.category
  });

  // Activity log
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, 'provider', 'complaint_status_changed', ?, NULL)`,
    [providerId, `Updated ${c.complaint_id} → ${status}`]
  );

  return { complaint_id: c.complaint_id, status, previous_status: c.status };
};

// ═══ UPDATE PROVIDER PROFILE ═══
const updateProfile = async (providerId, data) => {
  const { name, locality } = data;

  if (!name || name.trim().length < 2) {
    throw { status: 400, message: 'Provider name is required (min 2 characters)' };
  }
  if (name.length > 100) {
    throw { status: 400, message: 'Provider name too long' };
  }

  await providerModel.updateProfile(providerId, {
    name: name.trim(),
    locality: locality || null
  });

  return await providerModel.findById(providerId);
};

// ═══ CHANGE USERNAME ═══
const changeUsername = async (providerId, currentPassword, newUsername) => {
  const bcrypt = require('bcrypt');

  if (!currentPassword || !newUsername) {
    throw { status: 400, message: 'Current password and new username are required' };
  }
  if (newUsername.length < 4) {
    throw { status: 400, message: 'Username must be at least 4 characters' };
  }
  if (/\s/.test(newUsername)) {
    throw { status: 400, message: 'Username cannot contain spaces' };
  }

  // Fetch full provider record with hash
  const db = require('../db');
  const [rows] = await db.query('SELECT * FROM service_providers WHERE id = ? LIMIT 1', [providerId]);
  if (rows.length === 0) throw { status: 404, message: 'Provider not found' };
  const provider = rows[0];

  // Verify password
  const isMatch = await bcrypt.compare(currentPassword, provider.password_hash);
  if (!isMatch) throw { status: 401, message: 'Current password is incorrect' };

  if (provider.username.toLowerCase() === newUsername.toLowerCase()) {
    throw { status: 400, message: 'New username is same as current username' };
  }

  // Uniqueness check across users + providers
  const [userRows] = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [newUsername]);
  if (userRows.length > 0) throw { status: 409, message: 'Username is already taken' };

  const [provRows] = await db.query(
    'SELECT id FROM service_providers WHERE username = ? AND id != ? LIMIT 1',
    [newUsername, providerId]
  );
  if (provRows.length > 0) throw { status: 409, message: 'Username is already taken' };

  await providerModel.updateUsername(providerId, newUsername);

  return await providerModel.findById(providerId);
};

// ═══ CHANGE PASSWORD ═══
const changePassword = async (providerId, currentPassword, newPassword) => {
  const bcrypt = require('bcrypt');

  if (!currentPassword || !newPassword) {
    throw { status: 400, message: 'Current and new password are required' };
  }
  if (newPassword.length < 6) {
    throw { status: 400, message: 'New password must be at least 6 characters' };
  }
  if (currentPassword === newPassword) {
    throw { status: 400, message: 'New password must be different from current' };
  }

  const db = require('../db');
  const [rows] = await db.query('SELECT password_hash FROM service_providers WHERE id = ? LIMIT 1', [providerId]);
  if (rows.length === 0) throw { status: 404, message: 'Provider not found' };

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isMatch) throw { status: 401, message: 'Current password is incorrect' };

  const newHash = await bcrypt.hash(newPassword, 10);
  await providerModel.updatePassword(providerId, newHash);

  return { success: true };
};

module.exports = {
  getComplaints,
  getComplaintDetail,
  updateComplaintStatus,
  getStats,
  sendGeneralNotification,
  getProviderNotifications,
  getMyUsers,
  getAdminInfo,
  sendUserMessage,
  getAdminActivity,
  getWorkStats,
  getRecentUpdates,
  lookupComplaintByCid,
  updateStatusByCid,
  updateProfile,      // ⬅️ NEW
  changeUsername,     // ⬅️ NEW
  changePassword      // ⬅️ NEW
};