import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/generateToken.js';
import prisma from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true
      }
    });

    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Access denied. Insuffiencent permissions. '))
    }
    next();
  };
};