
import express from 'express';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addComment,
  getTicketStats
} from '../controllers/ticketController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createTicketValidator,
  updateTicketValidator,
  ticketQueryValidator,
  commentValidator
} from '../validators/ticketValidators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get ticket statistics
router.get('/stats', authorize['admin'], getTicketStats);

// Get all tickets with pagination and filters
router.get('/', authorize['admin'], validate(ticketQueryValidator, 'query'), getAllTickets);

// Get ticket by ID
router.get('/:id', getTicketById);

// Create ticket (admin, customer)
router.post('/', authorize['admin', 'customer'], validate(createTicketValidator), createTicket);

// Update ticket (admin, assigned agent)
router.put('/:id', authorize['admin', 'agent'], validate(updateTicketValidator), updateTicket);

// Add comment to ticket
router.post('/:id/comments', authorize['admin', 'agent'], validate(commentValidator), addComment);

export default router;