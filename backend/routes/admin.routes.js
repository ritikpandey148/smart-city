// backend/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

// All admin routes — require auth + admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Complaints
router.get('/complaints', adminController.getAllComplaints);
router.get('/complaints/:id', adminController.getComplaintDetail);
router.put('/complaints/:id/status', adminController.changeStatus);
router.put('/complaints/:id/assign', adminController.assignProvider);

// Users
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetail);

// Providers
router.get('/providers', adminController.getAllProviders);
router.put('/providers/:id/status', adminController.toggleProviderStatus);

// Stats & Activity
router.get('/stats', adminController.getStats);
router.get('/activity', adminController.getActivity);

module.exports = router;