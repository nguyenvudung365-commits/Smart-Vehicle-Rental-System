const { error } = require('../utils/response');

// Middleware validate request body bằng Zod schema
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const messages = err.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return error(res, messages || 'Dữ liệu không hợp lệ', 400, 'VALIDATION_ERROR');
    }
  };
}

module.exports = { validate };
