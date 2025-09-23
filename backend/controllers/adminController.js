import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalTickets,
    openTickets,
    resolvedTickets,
    closedTickets,
    ticketsByDay,
    ticketsByAgent,
    ticketsByPriority,
    recentActivity
  ] = await Promise.all([
    // Total tickets count
    prisma.ticket.count(),
    
    // Open tickets count
    prisma.ticket.count({
      where: { status: 'In_Progress' }
    }),
    
    // Resolved tickets count
    prisma.ticket.count({
      where: { status: 'Resolved' }
    }),
    
    // Closed tickets count
    prisma.ticket.count({
      where: { status: 'Closed' }
    }),
    
    // Tickets created per day (last 30 days) - grouped by DATE
    prisma.$queryRaw`SELECT CAST(created_at AS DATE) AS date, COUNT(*)::int AS count FROM "tickets" WHERE created_at >= ${thirtyDaysAgo} GROUP BY 1 ORDER BY 1 ASC`,
    
    // Tickets by agent
    prisma.ticket.groupBy({
      by: ['assignee_id'],
      where: {
        assignee_id: {
          not: null
        }
      },
      _count: {
        id: true
      },
      _avg: {
        priority_id: true
      }
    }),
    
    // Tickets by priority
    prisma.ticket.groupBy({
      by: ['priority_id'],
      _count: {
        id: true
      }
    }),
    
    // Recent activity (last 10 events)
    prisma.ticketEvent.findMany({
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
    })
  ]);

  // Fill last 30 days with zeros for missing dates
  const countsMap = new Map((ticketsByDay || []).map(r => [new Date(r.date).toISOString().split('T')[0], Number(r.count) || 0]));
  const formattedTicketsByDay = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    formattedTicketsByDay.push({ date: key, count: countsMap.get(key) || 0 });
  }

  // Format tickets by agent with agent details
  const agentsWithTickets = await Promise.all(
    ticketsByAgent.map(async (agentStat) => {
      const agent = await prisma.user.findUnique({
        where: { id: agentStat.assignee_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      });
      
      return {
        agent,
        ticket_count: agentStat._count.id,
        average_priority: agentStat._avg.priority_id
      };
    })
  );

  // Format tickets by priority with priority names
  const prioritiesWithTickets = await Promise.all(
    ticketsByPriority.map(async (priorityStat) => {
      const priority = await prisma.ticketPriority.findUnique({
        where: { id: priorityStat.priority_id }
      });
      
      return {
        priority,
        ticket_count: priorityStat._count.id
      };
    })
  );

  const dashboardData = {
    overview: {
      total_tickets: totalTickets,
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      closed_tickets: closedTickets,
      resolution_rate: totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0
    },
    charts: {
      tickets_by_day: formattedTicketsByDay,
      tickets_by_agent: agentsWithTickets,
      tickets_by_priority: prioritiesWithTickets
    },
    recent_activity: recentActivity
  };

  const response = ApiResponse.success(
    { dashboard: dashboardData },
    'Admin dashboard data retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const bulkAssignTickets = asyncHandler(async (req, res) => {
  const { ticket_ids, assignee_id } = req.body;

  // Verify assignee exists and is an agent
  const assignee = await prisma.user.findUnique({
    where: { id: assignee_id }
  });

  if (!assignee || assignee.role !== 'agent') {
    throw ApiError.badRequest('Assignee must be an active agent');
  }

  // Verify tickets exist
  const tickets = await prisma.ticket.findMany({
    where: {
      id: { in: ticket_ids }
    }
  });

  if (tickets.length !== ticket_ids.length) {
    throw ApiError.badRequest('One or more tickets not found');
  }

  // Bulk update tickets
  const result = await prisma.$transaction(async (tx) => {
    const updatedTickets = await tx.ticket.updateMany({
      where: {
        id: { in: ticket_ids }
      },
      data: {
        assignee_id,
        status: 'Assigned',
        updated_at: new Date()
      }
    });

    // Create ticket events for each assignment
    const events = ticket_ids.map(ticket_id => ({
      ticket_id,
      user_id: req.user.id,
      change_type: 'assignee_changed',
      new_value: assignee_id.toString(),
      created_at: new Date()
    }));

    await tx.ticketEvent.createMany({
      data: events
    });

    return updatedTickets;
  });

  const response = ApiResponse.success(
    { updated_count: result.count },
    'Tickets assigned successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const bulkUpdateTicketStatus = asyncHandler(async (req, res) => {
  const { ticket_ids, status } = req.body;

  // Verify tickets exist
  const tickets = await prisma.ticket.findMany({
    where: {
      id: { in: ticket_ids }
    }
  });

  if (tickets.length !== ticket_ids.length) {
    throw ApiError.badRequest('One or more tickets not found');
  }

  // Handle status-specific timestamps
  const now = new Date();
  const updateData = {
    status,
    updated_at: now
  };

  if (status === 'Resolved') {
    updateData.resolved_at = now;
  } else if (status === 'Closed') {
    updateData.closed_at = now;
  }

  // Bulk update tickets
  const result = await prisma.$transaction(async (tx) => {
    const updatedTickets = await tx.ticket.updateMany({
      where: {
        id: { in: ticket_ids }
      },
      data: updateData
    });

    // Create ticket events for each status change
    const events = ticket_ids.map(ticket_id => ({
      ticket_id,
      user_id: req.user.id,
      change_type: 'status_changed',
      new_value: status,
      created_at: now
    }));

    await tx.ticketEvent.createMany({
      data: events
    });

    return updatedTickets;
  });

  const response = ApiResponse.success(
    { updated_count: result.count },
    'Ticket status updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getAgentPerformance = asyncHandler(async (req, res) => {
  const { start_date, end_date, agent_id } = req.query;

  // Build date filter
  const dateFilter = {};
  if (start_date) {
    dateFilter.gte = new Date(start_date);
  }
  if (end_date) {
    dateFilter.lte = new Date(end_date);
  }

  // Build agent filter
  const agentFilter = agent_id ? { assignee_id: parseInt(agent_id) } : {};

  const [
    ticketStats,
    resolvedForAvg,
    priorityBreakdown
  ] = await Promise.all([
    // Ticket counts by status
    prisma.ticket.groupBy({
      by: ['status'],
      where: {
        ...agentFilter,
        created_at: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _count: {
        id: true
      }
    }),

    // Records to compute average resolution time (resolved items)
    prisma.ticket.findMany({
      where: {
        ...agentFilter,
        status: { in: ['Resolved', 'Closed'] },
        resolved_at: { not: null },
        created_at: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      select: { created_at: true, resolved_at: true }
    }),

    // Tickets by priority
    prisma.ticket.groupBy({
      by: ['priority_id'],
      where: {
        ...agentFilter,
        created_at: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _count: {
        id: true
      }
    })
  ]);

  // Get agent details if specific agent requested
  let agentDetails = null;
  if (agent_id) {
    agentDetails = await prisma.user.findUnique({
      where: { id: parseInt(agent_id) },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    });
  }

  // Format response
  // Compute average resolution in ms
  let avgResolutionMs = null;
  if (resolvedForAvg.length > 0) {
    const total = resolvedForAvg.reduce((sum, t) => sum + (t.resolved_at - t.created_at), 0);
    avgResolutionMs = Math.round(total / resolvedForAvg.length);
  }

  const performanceData = {
    agent: agentDetails,
    period: {
      start_date: start_date || null,
      end_date: end_date || null
    },
    stats: {
      by_status: {},
      total_tickets: ticketStats.reduce((sum, stat) => sum + stat._count.id, 0),
      average_resolution_ms: avgResolutionMs,
      resolved_tickets: resolvedForAvg.length
    },
    priority_breakdown: {}
  };

  ticketStats.forEach(stat => {
    performanceData.stats.by_status[stat.status] = stat._count.id;
  });

  priorityBreakdown.forEach(stat => {
    performanceData.priority_breakdown[stat.priority_id] = stat._count.id;
  });

  const response = ApiResponse.success(
    { performance: performanceData },
    'Agent performance data retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getSystemAnalytics = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    userStats,
    ticketTrends,
    busiestAgents,
    commonTags
  ] = await Promise.all([
    // User statistics
    prisma.user.groupBy({
      by: ['role', 'is_active'],
      _count: {
        id: true
      }
    }),

    // Ticket trends (last 30 days) - group by DATE
    prisma.$queryRaw`SELECT CAST(created_at AS DATE) AS date, COUNT(*)::int AS count FROM "tickets" WHERE created_at >= ${thirtyDaysAgo} GROUP BY 1 ORDER BY 1 ASC`,

    // Top 5 busiest agents
    prisma.ticket.groupBy({
      by: ['assignee_id'],
      where: {
        assignee_id: {
          not: null
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    }),

    // Most common tags
    prisma.ticketTag.groupBy({
      by: ['tag_id'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })
  ]);

  // Format analytics data
  const analyticsData = {
    users: {
      total: userStats.reduce((sum, stat) => sum + stat._count.id, 0),
      by_role: {},
      active: 0,
      inactive: 0
    },
    ticket_trends: (() => {
      const map = new Map((ticketTrends || []).map(r => [new Date(r.date).toISOString().split('T')[0], Number(r.count) || 0]));
      const out = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        out.push({ date: key, count: map.get(key) || 0 });
      }
      return out;
    })(),
    busiest_agents: [],
    common_tags: []
  };

  userStats.forEach(stat => {
    if (!analyticsData.users.by_role[stat.role]) {
      analyticsData.users.by_role[stat.role] = 0;
    }
    analyticsData.users.by_role[stat.role] += stat._count.id;
    
    if (stat.is_active) {
      analyticsData.users.active += stat._count.id;
    } else {
      analyticsData.users.inactive += stat._count.id;
    }
  });

  // Get agent details for busiest agents
  const agentDetails = await Promise.all(
    busiestAgents.map(async (agentStat) => {
      const agent = await prisma.user.findUnique({
        where: { id: agentStat.assignee_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      });
      
      return {
        agent,
        ticket_count: agentStat._count.id
      };
    })
  );

  analyticsData.busiest_agents = agentDetails;

  // Get tag details for common tags
  const tagDetails = await Promise.all(
    commonTags.map(async (tagStat) => {
      const tag = await prisma.tag.findUnique({
        where: { id: tagStat.tag_id }
      });
      
      return {
        tag,
        usage_count: tagStat._count.id
      };
    })
  );

  analyticsData.common_tags = tagDetails;

  const response = ApiResponse.success(
    { analytics: analyticsData },
    'System analytics retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});