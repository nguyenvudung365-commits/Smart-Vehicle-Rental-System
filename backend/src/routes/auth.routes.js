const express = require('express');
const { authController, schemas } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', validate(schemas.registerSchema), (req, res) => authController.register(req, res));
router.post('/login', validate(schemas.loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', validate(schemas.refreshSchema), (req, res) => authController.refresh(req, res));
router.get('/me', authenticate, (req, res) => authController.getProfile(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

module.exports = router;
