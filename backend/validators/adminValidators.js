import Joi from 'joi';

export const bulkAssignValidator = Joi.object({
  ticket_ids: Joi.array().items(Joi.number().integer().min(1)).min(1).required().messages({
    'array.base': 'Ticket IDs must be an array',
    'array.min': 'At least one ticket ID is required',
    'any.required': 'Ticket IDs are required'
  }),
  assignee_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'Assignee ID must be a number',
    'number.min': 'Assignee ID must be at least 1',
    'any.required': 'Assignee ID is required'
  })
});

export const bulkStatusValidator = Joi.object({
  ticket_ids: Joi.array().items(Joi.number().integer().min(1)).min(1).required().messages({
    'array.base': 'Ticket IDs must be an array',
    'array.min': 'At least one ticket ID is required',
    'any.required': 'Ticket IDs are required'
  }),
  status: Joi.string().valid('New','Assigned','In_Progress','On_Hold','Resolved','Closed','Reopened').required().messages({
    'any.only': 'Status must be one of: New, Assigned, In_Progress, On_Hold, Resolved, Closed, Reopened',
    'any.required': 'Status is required'
  })
});

export const analyticsQueryValidator = Joi.object({
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  agent_id: Joi.number().integer().min(1).optional()
});