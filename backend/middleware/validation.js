import { ApiError } from '../utils/apiError.js';

export const validate = (schema, source='body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return next(ApiError.validationError('Validation failed', errors));
    }
    
    next();
  };
};