// Chuan hoa response tu API
// Format: { success, data, message, error }

// === Ham buoi 4 (giu nguyen de auth controller van hoat dong) ===

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

// === Ham buoi 5 (them cho cac controller moi) ===

const ok = (res, data, message = 'OK') =>
  res.json({ success: true, message, data });

const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

const fail = (res, status, message, code = 'ERROR') =>
  res.status(status).json({ success: false, message, error: code });

/**
 * Boc async controller de auto-catch error -> next(err)
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { success, error, ok, created, fail, asyncHandler };
