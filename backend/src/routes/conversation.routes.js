const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const conversationService = require('../services/conversation.service');
const { success, error } = require('../utils/response');

const router = express.Router();

// POST /api/conversations — tao hoac lay conversation voi host theo vehicleId
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { hostId, vehicleId } = req.body;
    if (!hostId) return error(res, 'Thiếu hostId', 400);
    const conv = await conversationService.getOrCreateConversation(req.user.id, hostId, vehicleId);
    success(res, conv, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations — danh sach conversations cua toi
router.get('/', authenticate, async (req, res, next) => {
  try {
    const list = await conversationService.getMyConversations(req.user.id);
    success(res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { cursor } = req.query;
    const messages = await conversationService.getMessages(req.params.id, req.user.id, cursor);
    success(res, messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return error(res, 'Tin nhắn không được trống', 400);
    const msg = await conversationService.sendMessage(req.params.id, req.user.id, text.trim());
    success(res, msg, 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
