export class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Bad Request Error (400)
  static badRequest(message = "Bad Request", errors = []) {
    return new ApiError(400, message, errors);
  }

  // Unauthorized Error (401)
  static unauthorized(message = "Unauthorized access", errors = []) {
    return new ApiError(401, message, errors);
  }

  // Forbidden Error (403)
  static forbidden(message = "Forbidden", errors = []) {
    return new ApiError(403, message, errors);
  }

  // Not Found Error (404)
  static notFound(message = "Resource not found", errors = []) {
    return new ApiError(404, message, errors);
  }

  // Validation Error (422)
  static validationError(message = "Validation failed", errors = []) {
    return new ApiError(422, message, errors);
  }

  // Internal Server Error (500)
  static internal(message = "Internal server error", errors = []) {
    return new ApiError(500, message, errors);
  }
}