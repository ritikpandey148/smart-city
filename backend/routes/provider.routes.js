// backend/routes/provider.routes.js
const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

// All routes require auth + provider role
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

module.exports = router;