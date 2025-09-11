import express from 'express';
import {
  getAgentDashboard,
  getAssignedTickets,
  updateTicketStatus,
  updateTicketPriority,
  getAgentPerformance
} from '../controllers/agentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  agentTicketQueryValidator,
  updateStatusValidator,
  updatePriorityValidator
} from '../validators/agentValidators.js';

const router = express.Router();

// All routes require agent authentication
router.use(authenticate, authorize(['agent']));

// Agent dashboard
router.get('/dashboard', getAgentDashboard);

// Get assigned tickets
router.get('/tickets', validate(agentTicketQueryValidator, 'query'), getAssignedTickets);

// Update ticket status
router.patch('/tickets/:id/status', validate(updateStatusValidator), updateTicketStatus);

// Update ticket priority
router.patch('/tickets/:id/priority', validate(updatePriorityValidator), updateTicketPriority);

// Agent performance
router.get('/performance', getAgentPerformance);

export default router;