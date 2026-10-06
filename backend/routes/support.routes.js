// backend/routes/support.routes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);

// Citizen — send + view own
router.post('/', roleMiddleware('citizen'), supportController.create);
router.get('/my', roleMiddleware('citizen'), supportController.getMy);

// Admin — view all + reply
router.get('/all', roleMiddleware('admin'), supportController.getAll);
router.put('/:id/reply', roleMiddleware('admin'), supportController.reply);

module.exports = router;