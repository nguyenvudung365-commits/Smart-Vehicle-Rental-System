// Chuẩn hóa response từ API
// Format: { success, data, message, error }

function success(res, data, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, message, statusCode = 400, errorCode = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
  });
}

module.exports = { success, error };
