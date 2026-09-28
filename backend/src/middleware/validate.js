const ApiError = require('../utils/ApiError');

/**
 * Builds an Express middleware that validates req.body (or req.query, via
 * `source`) against a zod schema. On success, replaces the source object
 * with the parsed/coerced data so downstream code can trust its shape.
 * On failure, forwards a 400 ApiError with the zod issue list attached.
 */
function validate(schema, source = 'body') {
  return function (req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        ApiError.badRequest(
          'Validation failed',
          result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        )
      );
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
