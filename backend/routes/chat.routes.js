// backend/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/send', chatController.send);
router.get('/unread-count', chatController.unread);
router.get('/conversation/:otherRole/:otherId', chatController.getConversation);
router.get('/poll/:otherRole/:otherId', chatController.poll);
router.get('/last/:otherRole/:otherId', chatController.lastMessage);
router.delete('/:id', chatController.deleteMsg);

module.exports = router;