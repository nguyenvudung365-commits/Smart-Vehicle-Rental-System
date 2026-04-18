const express = require('express');
const { authController, schemas } = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload');

const router = express.Router();

router.post('/register', validate(schemas.registerSchema), (req, res) => authController.register(req, res));
router.post('/login', validate(schemas.loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', validate(schemas.refreshSchema), (req, res) => authController.refresh(req, res));
router.get('/me', authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticate, (req, res, next) => authController.updateProfile(req, res, next));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.put('/push-token', authenticate, (req, res, next) => authController.updatePushToken(req, res, next));
router.put('/avatar', authenticate, uploadSingle('avatar'), (req, res, next) => authController.updateAvatar(req, res, next));

module.exports = router;
