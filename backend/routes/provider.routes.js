// backend/routes/provider.routes.js
const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('provider'));

// Complaints
router.get('/complaints', providerController.getComplaints);
router.get('/complaints/:id', providerController.getComplaint);
router.put('/complaints/:id/status', providerController.updateStatus);

// Stats
router.get('/stats', providerController.getStats);

// Notifications
router.post('/notifications', providerController.sendNotification);
router.get('/notifications', providerController.getNotifications);

// Users + Admin info
router.get('/users', providerController.getUsers);
router.get('/admin-info', providerController.getAdmin);
// Send message to individual user
router.post('/send-user-message', providerController.sendUserMessage);

// Admin activity (status changes made by admin)
router.get('/admin-activity', providerController.getAdminActivity);
// Work updates
router.get('/work-stats', providerController.getWorkStats);
router.get('/recent-updates', providerController.getRecentUpdates);
router.get('/lookup-complaint/:cid', providerController.lookupComplaint);
router.post('/update-status-by-cid', providerController.updateStatusByCid);

// Profile
router.put('/profile', providerController.updateProfile);
router.put('/change-username', providerController.changeUsername);
router.put('/change-password', providerController.changePassword);

module.exports = router;