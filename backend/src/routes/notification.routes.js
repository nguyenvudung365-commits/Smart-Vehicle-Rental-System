const express = require('express');
const { list, readOne, readAll } = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', list);
router.patch('/:id/read', readOne);
router.patch('/read-all', readAll);

module.exports = router;
