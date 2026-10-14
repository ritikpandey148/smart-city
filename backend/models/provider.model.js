// backend/models/provider.model.js
const db = require('../db');

// ============ AUTH QUERIES ============
const findByUsername = async (username) => {
  const [rows] = await db.query(
    'SELECT * FROM service_providers WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, name, username, category, locality, account_status,
            last_login, last_seen, created_at
     FROM service_providers WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await db.query(
    'UPDATE service_providers SET last_login = NOW(), last_seen = NOW() WHERE id = ?',
    [id]
  );
};

const updateLastSeen = async (id) => {
  await db.query('UPDATE service_providers SET last_seen = NOW() WHERE id = ?', [id]);
};

// ============ ALL COMPLAINTS (provider sees all) ============
const getAllComplaints = async (filters = {}) => {
  let sql = `SELECT c.id, c.complaint_id, c.category, c.title, c.description,
                    c.image_path, c.location, c.locality, c.pincode,
                    c.nearby_address, c.observation, c.status,
                    c.assigned_provider_id,
                    c.submitted_at, c.updated_at, c.resolved_at,
                    u.id AS user_id, u.first_name, u.last_name, u.username, u.mobile,
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
  if (filters.search) {
    sql += ' AND (c.title LIKE ? OR c.complaint_id LIKE ? OR c.locality LIKE ? OR u.first_name LIKE ? OR u.username LIKE ?)';
    const like = `%${filters.search}%`;
    params.push(like, like, like, like, like);
  }
  sql += ' ORDER BY c.submitted_at DESC';

  const [rows] = await db.query(sql, params);
  return rows;
};

const getComplaintById = async (complaintId) => {
  const [rows] = await db.query(
    `SELECT c.*, 
            u.first_name, u.last_name, u.username, u.mobile, u.locality AS user_locality,
            sp.name AS provider_name
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN service_providers sp ON c.assigned_provider_id = sp.id
     WHERE c.id = ?
     LIMIT 1`,
    [complaintId]
  );
  return rows[0] || null;
};

const updateComplaintStatus = async (complaintId, providerId, status, remarks) => {
  await db.query(
    `UPDATE complaints
     SET status = ?,
         resolved_at = ${status === 'resolved' ? 'NOW()' : 'resolved_at'}
     WHERE id = ?`,
    [status, complaintId]
  );

  await db.query(
    `INSERT INTO complaint_status_history
      (complaint_id, status, changed_by_id, changed_by_role, remarks)
     VALUES (?, ?, ?, 'provider', ?)`,
    [complaintId, status, providerId, remarks || null]
  );
};

const getProviderStats = async () => {
  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS total_assigned,
       SUM(CASE WHEN category = 'garbage' THEN 1 ELSE 0 END) AS garbage,
       SUM(CASE WHEN category = 'pothole' THEN 1 ELSE 0 END) AS pothole,
       SUM(CASE WHEN category = 'others' THEN 1 ELSE 0 END) AS others,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
       SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
     FROM complaints`
  );
  return rows[0];
};

// ═══ UPDATE PROFILE ═══
const updateProfile = async (id, data) => {
  const { name, locality } = data;
  await db.query(
    'UPDATE service_providers SET name = ?, locality = ? WHERE id = ?',
    [name, locality, id]
  );
};

// ═══ UPDATE USERNAME ═══
const updateUsername = async (id, newUsername) => {
  await db.query(
    'UPDATE service_providers SET username = ? WHERE id = ?',
    [newUsername, id]
  );
};

// ═══ UPDATE PASSWORD ═══
const updatePassword = async (id, password_hash) => {
  await db.query(
    'UPDATE service_providers SET password_hash = ? WHERE id = ?',
    [password_hash, id]
  );
};

module.exports = {
  findByUsername,
  findById,
  updateLastLogin,
  updateLastSeen,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  getProviderStats,
  updateProfile,
  updateUsername,
  updatePassword
};