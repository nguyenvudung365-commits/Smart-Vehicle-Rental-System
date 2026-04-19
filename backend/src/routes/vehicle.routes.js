const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');

const router = express.Router();

router.get('/search', (req, res) => vehicleController.search(req, res));
router.get('/:id', (req, res) => vehicleController.getById(req, res));

module.exports = router;
