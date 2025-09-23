import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { listTags, createTag, updateTag, deleteTag } from '../controllers/tagController.js';

const router = express.Router();

// Public - list tags for dropdowns, search, etc.
router.get('/', listTags);

// Admin-only CRUD
router.post('/', authenticate, authorize(['admin','super_admin']), createTag);
router.put('/:id', authenticate, authorize(['admin','super_admin']), updateTag);
router.delete('/:id', authenticate, authorize(['admin','super_admin']), deleteTag);

export default router;


