// backend/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);

// Any logged-in user
router.get('/my', notificationController.getMy);
router.put('/:id/read', notificationController.markRead);

// Admin only
router.post('/send', roleMiddleware('admin'), notificationController.sendGeneral);

module.exports = router;