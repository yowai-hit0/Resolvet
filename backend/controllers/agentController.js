import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

export const getAgentDashboard = asyncHandler(async (req, res) => {
  const agentId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    assignedTickets,
    openTickets,
    resolvedTickets,
    recentActivity,
    performanceStats
  ] = await Promise.all([
    // Total assigned tickets
    prisma.ticket.count({
      where: { assignee_id: agentId }
    }),
    
    // Open tickets
    prisma.ticket.count({
      where: { 
        assignee_id: agentId,
        status: 'open'
      }
    }),
    
    // Resolved/closed tickets (last 30 days)
    prisma.ticket.count({
      where: {
        assignee_id: agentId,
        status: { in: ['resolved', 'closed'] },
        resolved_at: {
          gte: thirtyDaysAgo
        }
      }
    }),
    
    // Recent activity (last 10 events on assigned tickets)
    prisma.ticketEvent.findMany({
      where: {
        ticket: {
          assignee_id: agentId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true
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
    }),
    
    // Performance statistics
    prisma.ticket.groupBy({
      by: ['status'],
      where: {
        assignee_id: agentId,
        created_at: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    })
  ]);

  const dashboardData = {
    overview: {
      total_assigned: assignedTickets,
      currently_open: openTickets,
      recently_resolved: resolvedTickets,
      completion_rate: assignedTickets > 0 ? ((assignedTickets - openTickets) / assignedTickets) * 100 : 0
    },
    performance: {},
    recent_activity: recentActivity
  };

  performanceStats.forEach(stat => {
    dashboardData.performance[stat.status] = stat._count.id;
  });

  const response = ApiResponse.success(
    { dashboard: dashboardData },
    'Agent dashboard data retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getAssignedTickets = asyncHandler(async (req, res) => {
  const agentId = req.user.id;
  const {
    page = 1,
    limit = 10,
    status,
    priority_id,
    search
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {
    assignee_id: agentId
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

  // Get assigned tickets with pagination
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
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
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
    'Assigned tickets retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Get ticket
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) }
  });

  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check if agent is assigned to this ticket
  if (ticket.assignee_id !== req.user.id) {
    throw ApiError.forbidden('You can only update tickets assigned to you');
  }

  // Handle status transitions and timestamps
  const now = new Date();
  const updateData = {
    status,
    updated_at: now
  };

  if (status === 'resolved' && ticket.status !== 'resolved') {
    updateData.resolved_at = now;
  } else if (status !== 'resolved' && ticket.status === 'resolved') {
    updateData.resolved_at = null;
  }

  if (status === 'closed' && ticket.status !== 'closed') {
    updateData.closed_at = now;
  } else if (status !== 'closed' && ticket.status === 'closed') {
    updateData.closed_at = null;
  }

  // Update ticket
  const updatedTicket = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Create ticket event
    await tx.ticketEvent.create({
      data: {
        ticket_id: parseInt(id),
        user_id: req.user.id,
        change_type: 'status_changed',
        old_value: ticket.status,
        new_value: status
      }
    });

    return ticket;
  });

  const response = ApiResponse.success(
    { ticket: updatedTicket },
    'Ticket status updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateTicketPriority = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { priority_id } = req.body;

  // Verify priority exists
  const priority = await prisma.ticketPriority.findUnique({
    where: { id: priority_id }
  });

  if (!priority) {
    throw ApiError.badRequest('Invalid priority');
  }

  // Get ticket
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) }
  });

  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check if agent is assigned to this ticket
  if (ticket.assignee_id !== req.user.id) {
    throw ApiError.forbidden('You can only update tickets assigned to you');
  }

  // Update ticket priority
  const updatedTicket = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: parseInt(id) },
      data: {
        priority_id,
        updated_at: new Date()
      }
    });

    // Create ticket event
    await tx.ticketEvent.create({
      data: {
        ticket_id: parseInt(id),
        user_id: req.user.id,
        change_type: 'priority_changed',
        old_value: ticket.priority_id.toString(),
        new_value: priority_id.toString()
      }
    });

    return ticket;
  });

  const response = ApiResponse.success(
    { ticket: updatedTicket },
    'Ticket priority updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getAgentPerformance = asyncHandler(async (req, res) => {
  const agentId = req.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    ticketStats,
    resolutionTime,
    recentActivity
  ] = await Promise.all([
    // Ticket counts by status
    prisma.ticket.groupBy({
      by: ['status'],
      where: {
        assignee_id: agentId,
        created_at: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    }),

    // Average resolution time
    prisma.ticket.aggregate({
      where: {
        assignee_id: agentId,
        status: { in: ['resolved', 'closed'] },
        resolved_at: { not: null },
        created_at: {
          gte: thirtyDaysAgo
        }
      },
      _avg: {
        resolved_at: true
      }
    }),

    // Recent resolved tickets
    prisma.ticket.findMany({
      where: {
        assignee_id: agentId,
        status: { in: ['resolved', 'closed'] },
        resolved_at: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        priority: true
      },
      orderBy: {
        resolved_at: 'desc'
      },
      take: 5
    })
  ]);

  const performanceData = {
    period: {
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    },
    stats: {
      by_status: {},
      total_tickets: ticketStats.reduce((sum, stat) => sum + stat._count.id, 0),
      average_resolution_time: resolutionTime._avg.resolved_at
    },
    recent_resolutions: recentActivity
  };

  ticketStats.forEach(stat => {
    performanceData.stats.by_status[stat.status] = stat._count.id;
  });

  const response = ApiResponse.success(
    { performance: performanceData },
    'Agent performance data retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});