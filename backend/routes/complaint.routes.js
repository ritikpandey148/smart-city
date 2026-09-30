// backend/routes/complaint.routes.js
const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaint.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

// All routes require authentication
router.use(authMiddleware);

// Citizen only
router.post(
  '/',
  roleMiddleware('citizen'),
  upload.single('image'),
  complaintController.create
);

router.get('/my', roleMiddleware('citizen'), complaintController.getMy);
router.get('/stats/my', roleMiddleware('citizen'), complaintController.getStats);

// Any authenticated role (access control in service)
router.get('/:id', complaintController.getOne);
router.get('/:id/history', complaintController.getHistory);

module.exports = router;