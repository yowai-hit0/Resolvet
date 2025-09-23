import Joi from 'joi';

export const createTicketValidator = Joi.object({
  subject: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Subject must be at least 5 characters long',
    'string.max': 'Subject cannot exceed 200 characters',
    'any.required': 'Subject is required'
  }),
  description: Joi.string().min(10).required().messages({
    'string.min': 'Description must be at least 10 characters long',
    'any.required': 'Description is required'
  }),
  requester_email: Joi.string().email().optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  requester_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Requester name must be at least 2 characters long',
    'string.max': 'Requester name cannot exceed 100 characters',
    'any.required': 'Requester name is required'
  }),
  requester_phone: Joi.string()
    .pattern(/^\+?2507\d{8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be Rwanda format +2507XXXXXXXX',
      'any.required': 'Requester phone is required'
    }),
  location: Joi.string().valid(
    'Nyarugenge','Gasabo','Kicukiro',
    'Musanze','Burera','Gakenke',
    'Rubavu','Nyabihu','Rutsiro',
    'Ngororero','Muhanga','Kamonyi',
    'Ruhango','Nyanza','Huye',
    'Gisagara','Nyaruguru','Nyamagabe',
    'Karongi','Rusizi','Nyamasheke',
    'Gicumbi','Rulindo','Bugesera',
    'Ngoma','Kirehe','Kayonza','Rwamagana'
  ).optional().messages({
    'any.only': 'Location must be a valid Rwanda district'
  }),
  priority_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'Priority ID must be a number',
    'number.min': 'Priority ID must be at least 1',
    'any.required': 'Priority ID is required'
  }),
  assignee_id: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Assignee ID must be a number',
    'number.min': 'Assignee ID must be at least 1'
  }),
  tag_ids: Joi.array().items(Joi.number().integer().min(1)).optional().messages({
    'array.base': 'Tag IDs must be an array',
    'number.base': 'Each tag ID must be a number'
  }),
  image_urls: Joi.array().items(Joi.string().uri()).optional().allow(null).default([])
});

export const updateTicketValidator = Joi.object({
  subject: Joi.string().min(5).max(200).optional().messages({
    'string.min': 'Subject must be at least 5 characters long',
    'string.max': 'Subject cannot exceed 200 characters'
  }),
  description: Joi.string().min(10).optional().messages({
    'string.min': 'Description must be at least 10 characters long'
  }),
  requester_email: Joi.string().email().optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  requester_phone: Joi.string()
    .pattern(/^\+?2507\d{8}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone must be Rwanda format +2507XXXXXXXX'
    }),
  location: Joi.string().valid(
    'Nyarugenge','Gasabo','Kicukiro',
    'Musanze','Burera','Gakenke',
    'Rubavu','Nyabihu','Rutsiro',
    'Ngororero','Muhanga','Kamonyi',
    'Ruhango','Nyanza','Huye',
    'Gisagara','Nyaruguru','Nyamagabe',
    'Karongi','Rusizi','Nyamasheke',
    'Gicumbi','Rulindo','Bugesera',
    'Ngoma','Kirehe','Kayonza','Rwamagana'
  ).optional().messages({
    'any.only': 'Location must be a valid Rwanda district'
  }),
  priority_id: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Priority ID must be a number',
    'number.min': 'Priority ID must be at least 1'
  }),
  assignee_id: Joi.number().integer().min(1).optional().allow(null).messages({
    'number.base': 'Assignee ID must be a number',
    'number.min': 'Assignee ID must be at least 1'
  }),
  status: Joi.string().valid('New','Assigned','In_Progress','On_Hold','Resolved','Closed','Reopened').optional().messages({
    'any.only': 'Status must be one of: New, Assigned, In_Progress, On_Hold, Resolved, Closed, Reopened'
  }),
  tag_ids: Joi.array().items(Joi.number().integer().min(1)).optional().messages({
    'array.base': 'Tag IDs must be an array',
    'number.base': 'Each tag ID must be a number'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const ticketQueryValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('new', 'open', 'resolved', 'closed'),
  priority_id: Joi.number().integer().min(1),
  assignee_id: Joi.number().integer().min(1),
  created_by_id: Joi.number().integer().min(1),
  search: Joi.string().max(100).trim(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'priority_id', 'status').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

export const commentValidator = Joi.object({
  content: Joi.string().min(1).required().messages({
    'string.min': 'Comment content cannot be empty',
    'any.required': 'Comment content is required'
  }),
  is_internal: Joi.boolean().default(false)
});

export const attachmentQueryValidator = Joi.object({});