import Joi from 'joi';

export const agentTicketQueryValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('new', 'open', 'resolved', 'closed'),
  priority_id: Joi.number().integer().min(1),
  search: Joi.string().max(100).trim()
});

export const updateStatusValidator = Joi.object({
  status: Joi.string().valid('new', 'open', 'resolved', 'closed').required().messages({
    'any.only': 'Status must be one of: new, open, resolved, closed',
    'any.required': 'Status is required'
  })
});

export const updatePriorityValidator = Joi.object({
  priority_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'Priority ID must be a number',
    'number.min': 'Priority ID must be at least 1',
    'any.required': 'Priority ID is required'
  })
});