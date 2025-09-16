import bcrypt from 'bcryptjs';

import { generateToken } from '../utils/generateToken.js';
import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
       throw ApiError.badRequest('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        role
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        created_at: true
      }
    });

    // Generate token
    const token = generateToken(user.id, user.role);

   const response = ApiResponse.created(
    { user, token },
    'User registered successfully'
   );

    return res.status(response.statusCode).json(response);

  } catch (error) {
    console.error('Registration error:', error);
    if (error?.statusCode) throw error;
    throw ApiError.internal('Internal server error during registration');
  }
});

export const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true
      }
    });

    if (!user || !user.is_active) {
      throw ApiError.unauthorized('Invalid credentials or inactive account');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    // Generate token
    const token = generateToken(user.id, user.role);

        const response = ApiResponse.success(
      { user: userWithoutPassword, token },
      'Login successful'
    );

    res.status(response.statusCode).json(response);

  } catch (error) {
    console.error('Login error:', error);
    if (error?.statusCode) throw error;
    throw ApiError.internal('Internal server error during login');
  }
});

export const getProfile = asyncHandler(async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    const response = ApiResponse.success(
      { user },
      'Profile retrieved successfully'
    );

    return res.status(response.statusCode).json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    if (error?.statusCode) throw error;
    throw ApiError.internal('Internal server error');
  }
});