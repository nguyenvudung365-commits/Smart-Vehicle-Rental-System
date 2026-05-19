const { error } = require('../utils/response');

// Middleware validate request body bằng Zod schema
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return error(res, messages || 'Dữ liệu không hợp lệ', 400, 'VALIDATION_ERROR');
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
