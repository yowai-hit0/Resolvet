import Joi from 'joi';

export const updateUserValidator = Joi.object({
  first_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  last_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  role: Joi.string().valid('admin', 'agent', 'customer').optional().messages({
    'any.only': 'Role must be one of: admin, agent, customer'
  }),
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const updateUserStatusValidator = Joi.object({
  is_active: Joi.boolean().required().messages({
    'any.required': 'is_active field is required'
  })
});

export const userQueryValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: Joi.string().valid('admin', 'agent', 'customer'),
  is_active: Joi.boolean(),
  search: Joi.string().max(100).trim()
});