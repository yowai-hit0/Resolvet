import express from 'express';
import {
  getCustomerDashboard,
  getCustomerTickets,
  getCustomerTicketById,
  createCustomerTicket,
  addCustomerComment,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  getCustomerTicketStats
} from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createCustomerTicketValidator,
  customerTicketQueryValidator,
  customerCommentValidator,
  updateCustomerProfileValidator
} from '../validators/customerValidators.js';

const router = express.Router();

// All routes require customer authentication
router.use(authenticate, authorize(['customer']));

// Customer dashboard
router.get('/dashboard', getCustomerDashboard);

// Customer profile
router.get('/profile', getCustomerProfile);
router.put('/profile', validate(updateCustomerProfileValidator), updateCustomerProfile);
// router.post('/change-password', changeCustomerPassword);

// Customer tickets
router.get('/tickets', validate(customerTicketQueryValidator, 'query'), getCustomerTickets);
router.get('/tickets/:id', getCustomerTicketById);
router.post('/tickets', validate(createCustomerTicketValidator), createCustomerTicket);

// Ticket statistics
router.get('/tickets/stats', getCustomerTicketStats);

export default router;