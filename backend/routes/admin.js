import express from 'express';
import {
  getAdminDashboard,
  bulkAssignTickets,
  bulkUpdateTicketStatus,
  getAgentPerformance,
  getSystemAnalytics
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  bulkAssignValidator,
  bulkStatusValidator,
  analyticsQueryValidator
} from '../validators/adminValidators.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, authorize(['admin','super_admin']));

// Admin dashboard
router.get('/dashboard', getAdminDashboard);

// Bulk operations
router.post('/tickets/bulk-assign', validate(bulkAssignValidator), bulkAssignTickets);
router.post('/tickets/bulk-status', validate(bulkStatusValidator), bulkUpdateTicketStatus);

// Analytics
router.get('/analytics/agent-performance', validate(analyticsQueryValidator, 'query'), getAgentPerformance);
router.get('/analytics/system', getSystemAnalytics);

export default router;