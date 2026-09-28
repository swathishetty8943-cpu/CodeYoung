// Wraps an async route/controller function so any rejected promise is
// forwarded to next(err) automatically, letting the centralized error
// handler middleware deal with formatting - controllers never need their
// own try/catch-and-format blocks.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
