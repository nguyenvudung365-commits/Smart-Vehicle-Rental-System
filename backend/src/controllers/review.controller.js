const { createReview, getVehicleReviews } = require('../services/review.service');
const { success, error } = require('../utils/response');

async function create(req, res, next) {
  try {
    const review = await createReview(req.user.id, req.body);
    success(res, review, 'Đánh giá thành công', 201);
  } catch (err) {
    next(err);
  }
}

async function listByVehicle(req, res, next) {
  try {
    const data = await getVehicleReviews(req.params.vehicleId);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listByVehicle };
