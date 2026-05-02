const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { getMiaReply } = require('../services/chat.service');
const { success, error } = require('../utils/response');

const router = express.Router();

// POST /api/chat/mia
router.post('/mia', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return error(res, 'Vui lòng nhập tin nhắn', 400);
    }
    const reply = await getMiaReply(message.trim());
    success(res, { reply, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
