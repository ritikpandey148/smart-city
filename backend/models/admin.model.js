// backend/models/admin.model.js
const db = require('../db');

// ============ COMPLAINTS ============
const getAllComplaints = async (filters = {}) => {
  let sql = `SELECT c.*,
                    u.first_name, u.last_name, u.username, u.mobile,
                    sp.name AS provider_name
             FROM complaints c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN service_providers sp ON c.assigned_provider_id = sp.id
             WHERE 1=1`;
  const params = [];

  if (filters.category) {
    sql += ' AND c.category = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    sql += ' AND c.status = ?';
    params.push(filters.status);
  }
  if (filters.locality) {
    sql += ' AND c.locality = ?';
    params.push(filters.locality);
  }
  if (filters.search) {
    sql += ' AND (c.title LIKE ? OR c.complaint_id LIKE ? OR c.description LIKE ?)';
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY c.submitted_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit, 10));
  }

  const [rows] = await db.query(sql, params);
  return rows;
};

const updateComplaintStatus = async (id, status, remarks, changedById) => {
  await db.query(
    `UPDATE complaints SET status = ?, 
     resolved_at = ${status === 'resolved' ? 'NOW()' : 'resolved_at'}
     WHERE id = ?`,
    [status, id]
  );
  await db.query(
    `INSERT INTO complaint_status_history
      (complaint_id, status, changed_by_id, changed_by_role, remarks)
     VALUES (?, ?, ?, 'admin', ?)`,
    [id, status, changedById, remarks || null]
  );
};

const assignProvider = async (complaintId, providerId, adminId) => {
  await db.query(
    'UPDATE complaints SET assigned_provider_id = ?, status = "in_progress" WHERE id = ?',
    [providerId, complaintId]
  );
  await db.query(
    `INSERT INTO complaint_assignments
      (complaint_id, provider_id, assigned_by, assignment_status)
     VALUES (?, ?, ?, 'assigned')`,
    [complaintId, providerId, adminId]
  );
  await db.query(
    `INSERT INTO complaint_status_history
      (complaint_id, status, changed_by_id, changed_by_role, remarks)
     VALUES (?, 'in_progress', ?, 'admin', 'Complaint assigned to service provider')`,
    [complaintId, adminId]
  );
};

const getAllUsers = async (filters = {}) => {
  let sql = `SELECT u.id, u.first_name, u.last_name, u.gender, u.mobile, u.username,
                    u.locality, u.pincode, u.role, u.account_status,
                    u.last_login, u.last_seen, u.created_at,
                    (SELECT COUNT(*) FROM complaints WHERE user_id = u.id) AS complaint_count
             FROM users u
             WHERE u.role = 'citizen'`;
  const params = [];

  if (filters.search) {
    sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.mobile LIKE ?)';
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  if (filters.locality) {
    sql += ' AND u.locality = ?';
    params.push(filters.locality);
  }
  if (filters.status) {
    sql += ' AND u.account_status = ?';
    params.push(filters.status);
  }
  sql += ' ORDER BY u.created_at DESC';
  const [rows] = await db.query(sql, params);

  // Convert complaint_count to Number
  return rows.map(r => ({
    ...r,
    complaint_count: Number(r.complaint_count) || 0
  }));
};

const getUserDetail = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, first_name, last_name, gender, mobile, username,
            locality, pincode, role, account_status,
            last_login, last_seen, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getUserComplaints = async (userId) => {
  const [rows] = await db.query(
    `SELECT c.*, sp.name AS provider_name
     FROM complaints c
     LEFT JOIN service_providers sp ON c.assigned_provider_id = sp.id
     WHERE c.user_id = ?
     ORDER BY c.submitted_at DESC`,
    [userId]
  );
  return rows;
};

// ============ PROVIDERS ============
const getAllProviders = async () => {
  const [rows] = await db.query(
    `SELECT sp.id, sp.name, sp.username, sp.category, sp.locality,
            sp.account_status, sp.last_login, sp.last_seen, sp.created_at,
            (SELECT COUNT(*) FROM complaints WHERE assigned_provider_id = sp.id) AS assigned_count,
            (SELECT COUNT(*) FROM complaints WHERE assigned_provider_id = sp.id AND status = 'resolved') AS resolved_count
     FROM service_providers sp
     ORDER BY sp.created_at DESC`
  );
  return rows;
};

const updateProviderStatus = async (id, status) => {
  await db.query('UPDATE service_providers SET account_status = ? WHERE id = ?', [status, id]);
};

// ============ STATS ============
const getDashboardStats = async () => {
  const [rows] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM complaints) AS total_complaints,
       (SELECT COUNT(*) FROM complaints WHERE category = 'garbage') AS garbage,
       (SELECT COUNT(*) FROM complaints WHERE category = 'pothole') AS pothole,
       (SELECT COUNT(*) FROM complaints WHERE category = 'others') AS others,
       (SELECT COUNT(*) FROM complaints WHERE status = 'submitted') AS submitted,
       (SELECT COUNT(*) FROM complaints WHERE status = 'in_review') AS in_review,
       (SELECT COUNT(*) FROM complaints WHERE status = 'in_progress') AS in_progress,
       (SELECT COUNT(*) FROM complaints WHERE status = 'resolved') AS resolved,
       (SELECT COUNT(*) FROM users WHERE role = 'citizen') AS total_citizens,
       (SELECT COUNT(*) FROM service_providers) AS total_providers,
       (SELECT COUNT(*) FROM users WHERE role = 'citizen' AND last_seen >= NOW() - INTERVAL 5 MINUTE) AS active_now`
  );
  return rows[0];
};

const getActivityLogs = async (limit = 100) => {
  const [rows] = await db.query(
    `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?`,
    [parseInt(limit, 10)]
  );
  return rows;
};

module.exports = {
  getAllComplaints,
  updateComplaintStatus,
  assignProvider,
  getAllUsers,
  getUserDetail,
  getUserComplaints,
  getAllProviders,
  updateProviderStatus,
  getDashboardStats,
  getActivityLogs
};