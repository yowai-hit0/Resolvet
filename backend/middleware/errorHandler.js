import { ApiError } from '../utils/apiError.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  let error = err;

  // Handle Prisma errors
  if (err.code === 'P2002') {
    error = ApiError.badRequest('A record with this data already exists');
  } else if (err.code === 'P2025') {
    error = ApiError.notFound('Record not found');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  // Handle Validation errors
  if (err.name === 'ValidationError') {
    const errors = err.details ? err.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    })) : [];
    error = ApiError.validationError('Validation failed', errors);
  }

  // Ensure it's an ApiError instance
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || 'Internal Server Error',
      error.errors || []
    );
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};