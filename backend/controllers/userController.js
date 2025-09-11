import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    is_active,
    search
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {};
  
  if (role) {
    where.role = role;
  }
  
  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }
  
  if (search) {
    where.OR = [
      {
        first_name: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        last_name: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        email: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  // Get users with pagination
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limitNum
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);
  const hasNext = pageNum < totalPages;
  const hasPrev = pageNum > 1;

  const pagination = {
    currentPage: pageNum,
    totalPages,
    totalCount,
    hasNext,
    hasPrev,
    limit: limitNum
  };

  const response = ApiResponse.paginated(
    { users },
    pagination,
    'Users retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      tickets_created: {
        select: {
          id: true,
          ticket_code: true,
          subject: true,
          status: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 5
      },
      tickets_assigned: {
        select: {
          id: true,
          ticket_code: true,
          subject: true,
          status: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 5
      }
    }
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const response = ApiResponse.success(
    { user },
    'User retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getCurrentUser = asyncHandler(async (req, res) => {
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
    'Current user retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, role, is_active } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existingUser) {
    throw ApiError.notFound('User not found');
  }

  // Prevent admins from demoting themselves
  if (req.user.id === parseInt(id) && role && role !== 'admin') {
    throw ApiError.forbidden('Cannot change your own role from admin');
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: {
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      ...(role && { role }),
      ...(is_active !== undefined && { is_active })
    },
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
    { user: updatedUser },
    'User updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existingUser) {
    throw ApiError.notFound('User not found');
  }

  // Prevent users from deactivating themselves
  if (req.user.id === parseInt(id) && !is_active) {
    throw ApiError.forbidden('Cannot deactivate your own account');
  }

  // Update user status
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { is_active },
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
    { user: updatedUser },
    `User ${is_active ? 'activated' : 'deactivated'} successfully`
  );

  return res.status(response.statusCode).json(response);
});


export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existingUser) {
    throw ApiError.notFound('User not found');
  }

  // Prevent users from deleting themselves
  if (req.user.id === parseInt(id)) {
    throw ApiError.forbidden('Cannot delete your own account');
  }

  // Delete user (this will cascade delete related records due to Prisma schema)
  await prisma.user.delete({
    where: { id: parseInt(id) }
  });

  const response = ApiResponse.success(
    null,
    'User deleted successfully'
  );

  res.status(response.statusCode).json(response);
});

export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await prisma.user.groupBy({
    by: ['role', 'is_active'],
    _count: {
      id: true
    }
  });

  // Transform stats into a more usable format
  const formattedStats = {
    total: await prisma.user.count(),
    byRole: {},
    byStatus: {
      active: 0,
      inactive: 0
    }
  };

  stats.forEach(stat => {
    // Count by role
    if (!formattedStats.byRole[stat.role]) {
      formattedStats.byRole[stat.role] = {
        total: 0,
        active: 0,
        inactive: 0
      };
    }
    
    formattedStats.byRole[stat.role].total += stat._count.id;
    if (stat.is_active) {
      formattedStats.byRole[stat.role].active += stat._count.id;
      formattedStats.byStatus.active += stat._count.id;
    } else {
      formattedStats.byRole[stat.role].inactive += stat._count.id;
      formattedStats.byStatus.inactive += stat._count.id;
    }
  });

  const response = ApiResponse.success(
    { stats: formattedStats },
    'User statistics retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});