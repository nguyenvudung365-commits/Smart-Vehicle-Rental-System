// src/routes/card.routes.js
// FR-10: Lien ket the thanh toan
const router = require('express').Router();
const controller = require('../controllers/card.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { createCardSchema } = require('../validators');

// Tat ca route card deu can dang nhap
router.use(authenticate);

// POST /api/cards — them the moi
router.post('/', validate(createCardSchema), controller.create);

// GET /api/cards — danh sach the cua toi
router.get('/', controller.list);

// DELETE /api/cards/:id — xoa the
router.delete('/:id', controller.remove);

// PATCH /api/cards/:id/default — dat the mac dinh
router.patch('/:id/default', controller.setDefault);

module.exports = router;
