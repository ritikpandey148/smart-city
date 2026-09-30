// backend/models/complaint.model.js
const db = require('../db');

const generateComplaintId = async () => {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  const [rows] = await db.query(
    `SELECT complaint_id FROM complaints 
     WHERE complaint_id LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].complaint_id.split('-')[2], 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

const createComplaint = async (data) => {
  const {
    complaint_id, user_id, category, title, description,
    image_path, location, locality, pincode, nearby_address,
    latitude, longitude, observation
  } = data;

  const [result] = await db.query(
    `INSERT INTO complaints
      (complaint_id, user_id, category, title, description, image_path,
       location, locality, pincode, nearby_address, latitude, longitude,
       observation, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
    [
      complaint_id, user_id, category, title, description || null,
      image_path || null, location || null, locality || null, pincode || null,
      nearby_address || null, latitude || null, longitude || null,
      observation || null
    ]
  );
  return result.insertId;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT c.*, u.first_name, u.last_name, u.username, u.mobile,
            sp.name AS provider_name
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN service_providers sp ON c.assigned_provider_id = sp.id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const findByComplaintId = async (complaintId) => {
  const [rows] = await db.query(
    'SELECT * FROM complaints WHERE complaint_id = ? LIMIT 1',
    [complaintId]
  );
  return rows[0] || null;
};

const getByUserId = async (userId, filters = {}) => {
  let sql = `SELECT c.*, sp.name AS provider_name
             FROM complaints c
             LEFT JOIN service_providers sp ON c.assigned_provider_id = sp.id
             WHERE c.user_id = ?`;
  const params = [userId];

  if (filters.category) {
    sql += ' AND c.category = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    sql += ' AND c.status = ?';
    params.push(filters.status);
  }
  sql += ' ORDER BY c.submitted_at DESC';

  const [rows] = await db.query(sql, params);
  return rows;
};

const insertStatusHistory = async (data) => {
  const { complaint_id, status, changed_by_id, changed_by_role, remarks } = data;
  await db.query(
    `INSERT INTO complaint_status_history
      (complaint_id, status, changed_by_id, changed_by_role, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [complaint_id, status, changed_by_id, changed_by_role, remarks || null]
  );
};

const getStatusHistory = async (complaintId) => {
  const [rows] = await db.query(
    `SELECT h.*, 
            CASE 
              WHEN h.changed_by_role = 'provider' 
                THEN (SELECT name FROM service_providers WHERE id = h.changed_by_id)
              WHEN h.changed_by_role IN ('citizen','admin')
                THEN (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = h.changed_by_id)
              ELSE NULL
            END AS changed_by_name
     FROM complaint_status_history h
     WHERE h.complaint_id = ?
     ORDER BY h.created_at ASC`,
    [complaintId]
  );
  return rows;
};

const getUserStats = async (userId) => {
  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN category = 'garbage' THEN 1 ELSE 0 END) AS garbage,
       SUM(CASE WHEN category = 'pothole' THEN 1 ELSE 0 END) AS pothole,
       SUM(CASE WHEN category = 'others' THEN 1 ELSE 0 END) AS others,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
       SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
     FROM complaints WHERE user_id = ?`,
    [userId]
  );
  return rows[0];
};

const logActivity = async (data) => {
  const { user_id, user_role, action, description, ip_address } = data;
  await db.query(
    `INSERT INTO activity_logs (user_id, user_role, action, description, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, user_role, action, description || null, ip_address || null]
  );
};

module.exports = {
  generateComplaintId,
  createComplaint,
  findById,
  findByComplaintId,
  getByUserId,
  insertStatusHistory,
  getStatusHistory,
  getUserStats,
  logActivity
};