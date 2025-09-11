import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

export const getCustomerDashboard = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalTickets,
    openTickets,
    resolvedTickets,
    recentTickets,
    recentActivity
  ] = await Promise.all([
    // Total tickets count
    prisma.ticket.count({
      where: { created_by_id: customerId }
    }),
    
    // Open tickets count
    prisma.ticket.count({
      where: { 
        created_by_id: customerId,
        status: { in: ['new', 'open'] }
      }
    }),
    
    // Resolved/closed tickets count
    prisma.ticket.count({
      where: { 
        created_by_id: customerId,
        status: { in: ['resolved', 'closed'] }
      }
    }),
    
    // Recent tickets (last 5)
    prisma.ticket.findMany({
      where: { created_by_id: customerId },
      include: {
        priority: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    }),
    
    // Recent activity (last 5 events on customer's tickets)
    prisma.ticketEvent.findMany({
      where: {
        ticket: {
          created_by_id: customerId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticket_code: true,
            subject: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    })
  ]);

  const dashboardData = {
    overview: {
      total_tickets: totalTickets,
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      resolution_rate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0
    },
    recent_tickets: recentTickets,
    recent_activity: recentActivity
  };

  const response = ApiResponse.success(
    { dashboard: dashboardData },
    'Customer dashboard data retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getCustomerTickets = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const {
    page = 1,
    limit = 10,
    status,
    priority_id,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {
    created_by_id: customerId
  };
  
  if (status) {
    where.status = status;
  }
  
  if (priority_id) {
    where.priority_id = parseInt(priority_id);
  }
  
  if (search) {
    where.OR = [
      {
        subject: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        description: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        ticket_code: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  // Get customer tickets with pagination
  const [tickets, totalCount] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        priority: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: {
              where: {
                is_internal: false
              }
            },
            attachments: true
          }
        }
      },
      orderBy: {
        [sort_by]: sort_order
      },
      skip,
      take: limitNum
    }),
    prisma.ticket.count({ where })
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

  // Format tags for response
  const formattedTickets = tickets.map(ticket => ({
    ...ticket,
    tags: ticket.tags.map(ticketTag => ticketTag.tag)
  }));

  const response = ApiResponse.paginated(
    { tickets: formattedTickets },
    pagination,
    'Customer tickets retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getCustomerTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customerId = req.user.id;

  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) },
    include: {
      priority: {
        select: {
          id: true,
          name: true
        }
      },
      assignee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      },
      created_by: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      comments: {
        where: {
          is_internal: false // Customers can only see non-internal comments
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'asc'
        }
      },
      attachments: {
        include: {
          uploaded_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: {
          uploaded_at: 'desc'
        }
      }
    }
  });

  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check if customer owns this ticket
  if (ticket.created_by_id !== customerId) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  // Format tags for response
  const formattedTicket = {
    ...ticket,
    tags: ticket.tags.map(ticketTag => ticketTag.tag)
  };

  const response = ApiResponse.success(
    { ticket: formattedTicket },
    'Ticket retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const createCustomerTicket = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const {
    subject,
    description,
    priority_id = 1
  } = req.body;

  // Get customer details for requester information
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      email: true,
      first_name: true,
      last_name: true
    }
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  // Verify priority exists
  const priority = await prisma.ticketPriority.findUnique({
    where: { id: priority_id }
  });

  if (!priority) {
    throw ApiError.badRequest('Invalid priority');
  }

  // Generate ticket code
  const generateTicketCode = () => {
    const prefix = 'RES';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  };

  const ticket_code = generateTicketCode();

  // Create ticket
  const ticket = await prisma.$transaction(async (tx) => {
    const newTicket = await tx.ticket.create({
      data: {
        ticket_code,
        subject,
        description,
        requester_email: customer.email,
        requester_name: `${customer.first_name} ${customer.last_name}`,
        priority_id,
        created_by_id: customerId,
        status: 'new'
      },
      include: {
        priority: true
      }
    });

    // Create ticket event for creation
    await tx.ticketEvent.create({
      data: {
        ticket_id: newTicket.id,
        user_id: customerId,
        change_type: 'ticket_created',
        new_value: JSON.stringify({
          subject,
          status: 'new'
        })
      }
    });

    return newTicket;
  });

  const response = ApiResponse.created(
    { ticket },
    'Ticket created successfully'
  );

  return res.status(response.statusCode).json(response);
});


export const getCustomerProfile = asyncHandler(async (req, res) => {
  const customerId = req.user.id;

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
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

  if (!customer) {
    throw ApiError.notFound('Customer profile not found');
  }

  const response = ApiResponse.success(
    { customer },
    'Customer profile retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateCustomerProfile = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { first_name, last_name } = req.body;

  // Update customer profile
  const updatedCustomer = await prisma.user.update({
    where: { id: customerId },
    data: {
      ...(first_name && { first_name }),
      ...(last_name && { last_name })
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
    { customer: updatedCustomer },
    'Profile updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

// export const changeCustomerPassword = asyncHandler(async (req, res) => {
//   const customerId = req.user.id;
//   const { current_password, new_password } = req.body;

//   if (!current_password || !new_password) {
//     throw ApiError.badRequest('Current password and new password are required');
//   }

//   if (new_password.length < 6) {
//     throw ApiError.badRequest('New password must be at least 6 characters long');
//   }

//   // Get customer with password hash
//   const customer = await prisma.user.findUnique({
//     where: { id: customerId },
//     select: {
//       id: true,
//       password_hash: true
//     }
//   });

//   if (!customer) {
//     throw ApiError.notFound('Customer not found');
//   }

//   // Verify current password
//   const isCurrentPasswordValid = await bcrypt.compare(current_password, customer.password_hash);
//   if (!isCurrentPasswordValid) {
//     throw ApiError.badRequest('Current password is incorrect');
//   }

//   // Hash new password
//   const saltRounds = 12;
//   const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

//   // Update password
//   await prisma.user.update({
//     where: { id: customerId },
//     data: {
//       password_hash: newPasswordHash
//     }
//   });

//   const response = ApiResponse.success(
//     null,
//     'Password changed successfully'
//   );

//   return res.status(response.statusCode).json(response);
// });

export const getCustomerTicketStats = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    statusStats,
    priorityStats,
    recentActivity
  ] = await Promise.all([
    // Ticket counts by status
    prisma.ticket.groupBy({
      by: ['status'],
      where: {
        created_by_id: customerId
      },
      _count: {
        id: true
      }
    }),

    // Tickets by priority
    prisma.ticket.groupBy({
      by: ['priority_id'],
      where: {
        created_by_id: customerId
      },
      _count: {
        id: true
      }
    }),

    // Recent ticket activity (last 7 days)
    prisma.ticketEvent.findMany({
      where: {
        ticket: {
          created_by_id: customerId
        },
        created_at: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticket_code: true,
            subject: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    })
  ]);

  // Format statistics
  const stats = {
    by_status: {},
    by_priority: {},
    total_tickets: statusStats.reduce((sum, stat) => sum + stat._count.id, 0),
    recent_activity: recentActivity
  };

  statusStats.forEach(stat => {
    stats.by_status[stat.status] = stat._count.id;
  });

  priorityStats.forEach(stat => {
    stats.by_priority[stat.priority_id] = stat._count.id;
  });

  const response = ApiResponse.success(
    { stats },
    'Ticket statistics retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});