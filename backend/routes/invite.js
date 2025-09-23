import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';
import { createInvite, listInvites, resendInvite, revokeInvite, acceptInvite } from '../controllers/inviteController.js';

const router = Router();

const createInviteSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'agent').required(),
  expiresInHours: Joi.number().integer().min(1).max(720).optional()
});

const listInvitesQuery = Joi.object({
  status: Joi.string().valid('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED').optional(),
  email: Joi.string().email().optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional()
});

const acceptInviteSchema = Joi.object({
  token: Joi.string().required(),
  name: Joi.string().min(2).max(100).optional(),
  password: Joi.string().min(8).max(100).optional()
});

// Admin routes
router.post('/', authenticate, authorize(['super_admin']), validate(createInviteSchema), createInvite);
router.get('/', authenticate, authorize(['super_admin']), validate(listInvitesQuery, 'query'), listInvites);
router.post('/:id/resend', authenticate, authorize(['super_admin']), resendInvite);
router.post('/:id/revoke', authenticate, authorize(['super_admin']), revokeInvite);

// Public accept
router.post('/accept', validate(acceptInviteSchema), acceptInvite);

export default router;


