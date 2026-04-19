const vehicleService = require('../services/vehicle.service');
const { success, error } = require('../utils/response');

class VehicleController {
  // GET /api/vehicles/search?province=...&minPrice=...&page=1
  async search(req, res) {
    try {
      const result = await vehicleService.search({
        ...req.query,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 50),
      });
      return success(res, result);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  // GET /api/vehicles/:id
  async getById(req, res) {
    try {
      const vehicle = await vehicleService.getById(req.params.id);
      return success(res, vehicle);
    } catch (err) {
      return error(res, err.message, err.message.includes('Không tìm thấy') ? 404 : 400);
    }
  }
}

module.exports = new VehicleController();
