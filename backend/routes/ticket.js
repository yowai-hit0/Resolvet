
import express from 'express';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addComment,
  getTicketStats,
  deleteTempUploads
} from '../controllers/ticketController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { uploadSingleImage, uploadMultipleImages } from '../middleware/uploadImage.js';
// import { uploadMultipleImages as uploadTempImages, handleUploadErrors as handleTempUploadErrors } from '../middleware/uploadImage.js';
import {
  createTicketValidator,
  updateTicketValidator,
  ticketQueryValidator,
  commentValidator
} from '../validators/ticketValidators.js';
import { uploadTicketImage, deleteTicketAttachment, uploadTicketImages, getTicketPriorities, createTicketPriority, updateTicketPriority, deleteTicketPriority, uploadTempTicketImages } from '../controllers/ticketController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get ticket statistics
router.get('/stats', authorize(['admin']), getTicketStats);

// Public GET for priorities
router.get('/priorities', getTicketPriorities);

// Manage priorities (admin)
router.post('/priorities', authorize(['admin']), createTicketPriority);
router.put('/priorities/:id', authorize(['admin']), updateTicketPriority);
router.delete('/priorities/:id', authorize(['admin']), deleteTicketPriority);

// Get all tickets with pagination and filters
router.get('/', authorize(['admin', 'agent', 'customer']), validate(ticketQueryValidator, 'query'), getAllTickets);

// Get ticket by ID
router.get('/:id', getTicketById);

// Create ticket (admin, customer, agent)
router.post('/', authorize(['admin', 'customer','agent']), validate(createTicketValidator), createTicket);

// Update ticket (admin, assigned agent)
router.put('/:id', authorize(['admin', 'agent']), validate(updateTicketValidator), updateTicket);

// Add comment to ticket
router.post('/:id/comments', authorize(['admin', 'agent']), validate(commentValidator), addComment);

// Image attachments
router.post('/:id/attachments/image', authorize(['admin', 'agent']), uploadSingleImage, uploadTicketImage);
router.post('/:id/attachments/images', authorize(['admin', 'agent']), uploadMultipleImages, uploadTicketImages);
router.delete('/:id/attachments/:attachmentId', authorize(['admin', 'agent']), deleteTicketAttachment);

// Temp pre-create upload (authenticated users)
router.post('/attachments/temp/images', uploadMultipleImages, uploadTempTicketImages);
router.delete('/attachments/temp', authorize(['admin', 'agent', 'customer']), deleteTempUploads);
// Convenience POST endpoint to support clients that cannot send DELETE with body
router.post('/attachments/temp/delete', authorize(['admin', 'agent', 'customer']), deleteTempUploads);
export default router;