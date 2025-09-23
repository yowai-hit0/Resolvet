import express from 'express';
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserStats
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  updateUserValidator,
  updateUserStatusValidator,
  userQueryValidator
} from '../validators/userValidators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', getCurrentUser);

// Get user statistics (admin only)
router.get('/stats', authorize(['admin','super_admin']), getUserStats);

// Get all users with pagination and filters (admin only)
router.get('/', authorize(['admin','super_admin']), validate(userQueryValidator, 'query'), getAllUsers);

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  
  // Allow users to access their own profile
  if (req.user.id === parseInt(id) || req.user.role === 'admin' || req.user.role === 'super_admin') {
    return getUserById(req, res, next);
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only view your own profile.'
  });
});

// Update user (admin can update anyone, users can update their own profile except role)
router.put('/:id', validate(updateUserValidator), async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (req.user.id === parseInt(id)) {
    // Users can update their own profile but not their role
    if (role && role !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }
    return updateUser(req, res, next);
  }
  
  // Only admin can update other users
  if (req.user.role === 'super_admin') {
    return updateUser(req, res, next);
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only update your own profile.'
  });
});

 //soft delete
router.patch('/:id/status', authorize(['super_admin']), validate(updateUserStatusValidator), updateUserStatus);

// Delete user (admin only)
// router.delete('/:id', authorize(['admin']), deleteUser);

export default router;