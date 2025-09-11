import Joi from 'joi';

export const createCustomerTicketValidator = Joi.object({
  subject: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Subject must be at least 5 characters long',
    'string.max': 'Subject cannot exceed 200 characters',
    'any.required': 'Subject is required'
  }),
  description: Joi.string().min(10).required().messages({
    'string.min': 'Description must be at least 10 characters long',
    'any.required': 'Description is required'
  }),
  priority_id: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Priority ID must be a number',
    'number.min': 'Priority ID must be at least 1'
  })
});

export const customerTicketQueryValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('new', 'open', 'resolved', 'closed'),
  priority_id: Joi.number().integer().min(1),
  search: Joi.string().max(100).trim(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'priority_id', 'status').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

export const customerCommentValidator = Joi.object({
  content: Joi.string().min(1).required().messages({
    'string.min': 'Comment content cannot be empty',
    'any.required': 'Comment content is required'
  })
});

export const updateCustomerProfileValidator = Joi.object({
  first_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  last_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});