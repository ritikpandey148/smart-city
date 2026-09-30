// backend/services/complaint.service.js
const complaintModel = require('../models/complaint.model');
const { COMPLAINT_CATEGORY, OBSERVATION, LOCALITIES, PINCODES } = require('../config/constants');

const VALID_CATEGORIES = Object.values(COMPLAINT_CATEGORY);
const VALID_OBSERVATIONS = Object.values(OBSERVATION);

// ============ CREATE COMPLAINT ============
const createComplaint = async (userId, data, file, ip) => {
  const {
    category, title, description, location, locality, pincode,
    nearby_address, latitude, longitude, observation
  } = data;

  // Validation
  if (!category) throw { status: 400, message: 'Category is required' };
  if (!VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: 'Invalid category. Must be garbage, pothole or others' };
  }
  if (!title || title.trim().length < 3) {
    throw { status: 400, message: 'Title is required (min 3 characters)' };
  }
  if (title.length > 150) {
    throw { status: 400, message: 'Title must be 150 characters or less' };
  }
  if (!locality) throw { status: 400, message: 'Locality is required' };
  if (!LOCALITIES.includes(locality)) {
    throw { status: 400, message: 'Invalid locality' };
  }
  if (!pincode) throw { status: 400, message: 'Pincode is required' };
  if (!PINCODES.includes(pincode)) {
    throw { status: 400, message: 'Invalid pincode' };
  }
  if (observation && !VALID_OBSERVATIONS.includes(observation)) {
    throw { status: 400, message: 'Invalid observation value' };
  }

  // Generate unique complaint ID
  const complaint_id = await complaintModel.generateComplaintId();

  // Image path
  const image_path = file ? `/uploads/${file.filename}` : null;

  // Insert complaint
  const newId = await complaintModel.createComplaint({
    complaint_id,
    user_id: userId,
    category,
    title: title.trim(),
    description: description ? description.trim() : null,
    image_path,
    location: location || locality,
    locality,
    pincode,
    nearby_address: nearby_address || null,
    latitude: latitude || null,
    longitude: longitude || null,
    observation: observation || null
  });

  // Insert initial status history
  await complaintModel.insertStatusHistory({
    complaint_id: newId,
    status: 'submitted',
    changed_by_id: userId,
    changed_by_role: 'citizen',
    remarks: 'Complaint submitted by citizen'
  });

  // Log activity
  await complaintModel.logActivity({
    user_id: userId,
    user_role: 'citizen',
    action: 'complaint_submitted',
    description: `Complaint ${complaint_id} submitted (${category})`,
    ip_address: ip
  });

  const complaint = await complaintModel.findById(newId);
  return complaint;
};

// ============ GET MY COMPLAINTS ============
const getMyComplaints = async (userId, filters) => {
  return await complaintModel.getByUserId(userId, filters);
};

// ============ GET ONE COMPLAINT ============
const getComplaintById = async (id, requesterId, requesterRole) => {
  const complaint = await complaintModel.findById(id);
  if (!complaint) throw { status: 404, message: 'Complaint not found' };

  // Access control
  if (requesterRole === 'citizen' && complaint.user_id !== requesterId) {
    throw { status: 403, message: 'Access denied to this complaint' };
  }
  if (requesterRole === 'provider' && complaint.assigned_provider_id !== requesterId) {
    throw { status: 403, message: 'Access denied: not assigned to you' };
  }
  // Admin can access all

  return complaint;
};

// ============ GET HISTORY ============
const getComplaintHistory = async (id, requesterId, requesterRole) => {
  // Verify access first
  await getComplaintById(id, requesterId, requesterRole);
  return await complaintModel.getStatusHistory(id);
};

// ============ GET MY STATS ============
const getMyStats = async (userId) => {
  const stats = await complaintModel.getUserStats(userId);
  // Convert null to 0
  return {
    total: Number(stats.total) || 0,
    garbage: Number(stats.garbage) || 0,
    pothole: Number(stats.pothole) || 0,
    others: Number(stats.others) || 0,
    submitted: Number(stats.submitted) || 0,
    in_review: Number(stats.in_review) || 0,
    in_progress: Number(stats.in_progress) || 0,
    resolved: Number(stats.resolved) || 0
  };
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintHistory,
  getMyStats
};