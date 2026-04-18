// src/middlewares/validate.js
// Middleware validate request body bang Zod schema (buoi 5)
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return res.status(400).json({
      success: false,
      message: firstError.message,
      error: 'VALIDATION_ERROR',
      field: firstError.path.join('.'),
    });
  }
  req.body = result.data; // body da duoc coerce/parse
  next();
};

module.exports = validate;
