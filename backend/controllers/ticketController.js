import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';
import cloudinary from '../config/cloudinary.js';

// Helper function to generate ticket code
const generateTicketCode = () => {
  const prefix = 'RES';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

// Helper function to check if user has access to ticket
const hasTicketAccess = (user, ticket) => {
  if (user.role === 'admin') return true;
  if (user.role === 'agent' && ticket.assignee_id === user.id) return true;
  if (user.role === 'customer' && ticket.created_by_id === user.id) return true;
  return false;
};
const hasTicketUpdateAccess = (user, ticket) => {
  if (user.role === 'admin') return true;
  if (user.role === 'agent' && ticket.assignee_id === user.id) return true;
  return false;
};

export const getAllTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority_id,
    assignee_id,
    created_by_id,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause based on user role
  const where = {};
  
  // Role-based filtering
  if (req.user.role === 'agent') {
    where.assignee_id = req.user.id;
  } else if (req.user.role === 'customer') {
    where.created_by_id = req.user.id;
  }
  
  // Additional filters
  if (status) {
    where.status = status;
  }
  
  if (priority_id) {
    where.priority_id = parseInt(priority_id);
  }
  
  if (assignee_id) {
    where.assignee_id = parseInt(assignee_id);
  }
  
  if (created_by_id) {
    where.created_by_id = parseInt(created_by_id);
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
      },
      {
        requester_name: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        requester_email: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  // Get tickets with pagination
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
    'Tickets retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const getTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticketId = parseInt(id);
  if (!Number.isFinite(ticketId)) {
    throw ApiError.badRequest('Invalid ticket id');
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
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
      },
      ticket_events: {
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }
    }
  });

  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check access
  if (!hasTicketAccess(req.user, ticket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  // Format tags for response
  const formattedTicket = {
    ...ticket,
    tags: ticket.tags.map(ticketTag => ticketTag.tag),
    attachments: ticket.attachments.map(a => ({ ...a, size: Number(a.size) })),
  };

  const response = ApiResponse.success(
    { ticket: formattedTicket },
    'Ticket retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const createTicket = asyncHandler(async (req, res) => {
  const {
    subject,
    description,
    requester_email,
    requester_name,
    priority_id,
    assignee_id,
    tag_ids,
    image_urls
  } = req.body;

  // Verify priority exists
  const priority = await prisma.ticketPriority.findUnique({
    where: { id: priority_id }
  });

  if (!priority) {
    throw ApiError.badRequest('Invalid priority');
  }

  // Verify assignee exists and is an agent (if provided)
  if (assignee_id) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignee_id }
    });

    if (!assignee || assignee.role !== 'agent') {
      throw ApiError.badRequest('Assignee must be an active agent');
    }
  }

  // Verify tags exist (if provided)
  if (tag_ids && tag_ids.length > 0) {
    const tags = await prisma.tag.findMany({
      where: { id: { in: tag_ids } }
    });

    if (tags.length !== tag_ids.length) {
      throw ApiError.badRequest('One or more tags are invalid');
    }
  }

  // Generate ticket code
  const ticket_code = generateTicketCode();

  // Create ticket with transaction to handle tags
  const ticket = await prisma.$transaction(async (tx) => {
    const newTicket = await tx.ticket.create({
      data: {
        ticket_code,
        subject,
        description,
        requester_email,
        requester_name,
        priority_id,
        assignee_id,
        created_by_id: req.user.id,
        status: assignee_id ? 'open' : 'new',
        ...(assignee_id && { status: 'open' })
      },
      include: {
        priority: true,
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    // Create ticket events for creation
    await tx.ticketEvent.create({
      data: {
        ticket_id: newTicket.id,
        user_id: req.user.id,
        change_type: 'ticket_created',
        new_value: JSON.stringify({
          subject,
          status: newTicket.status
        })
      }
    });

    // Add tags if provided
    if (tag_ids && tag_ids.length > 0) {
      await tx.ticketTag.createMany({
        data: tag_ids.map(tag_id => ({
          ticket_id: newTicket.id,
          tag_id
        }))
      });
    }

    // Attach pre-uploaded image urls if provided (dedup)
    if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
      const uniqueUrls = Array.from(new Set(image_urls.filter(Boolean)));
      if (uniqueUrls.length > 0) {
        await tx.attachment.createMany({
          data: uniqueUrls.map((url) => ({
            original_filename: url.split('/').pop() || 'image',
            stored_filename: url,
            mime_type: 'image',
            size: BigInt(0),
            ticket_id: newTicket.id,
            uploaded_by_id: req.user.id
          }))
        });
      }
    }

    return newTicket;
  });

  const response = ApiResponse.created(
    { ticket },
    'Ticket created successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Get existing ticket
  const existingTicket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existingTicket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check access
  if (!hasTicketUpdateAccess(req.user, existingTicket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  // Verify priority exists if updating
  if (updates.priority_id) {
    const priority = await prisma.ticketPriority.findUnique({
      where: { id: updates.priority_id }
    });

    if (!priority) {
      throw ApiError.badRequest('Invalid priority');
    }
  }

  // Verify assignee exists and is an agent if updating
  if (updates.assignee_id !== undefined) {
    if(req.user.role !== 'admin'){
      throw ApiError.forbidden('access denied');
    }
    if (updates.assignee_id === null) {
      updates.assignee_id = null;
    } else {
      const assignee = await prisma.user.findUnique({
        where: { id: updates.assignee_id }
      });

      if (!assignee || assignee.role !== 'agent') {
        throw ApiError.badRequest('Assignee must be an active agent');
      }
    }
  }

  // Handle status transitions and timestamps
  const now = new Date();
  const statusUpdates = {};

  if (updates.status) {
    statusUpdates.status = updates.status;
    
    if (updates.status === 'resolved' && existingTicket.status !== 'resolved') {
      statusUpdates.resolved_at = now;
    } else if (updates.status !== 'resolved' && existingTicket.status === 'resolved') {
      statusUpdates.resolved_at = null;
    }
    
    if (updates.status === 'closed' && existingTicket.status !== 'closed') {
      statusUpdates.closed_at = now;
    } else if (updates.status !== 'closed' && existingTicket.status === 'closed') {
      statusUpdates.closed_at = null;
    }
  }

  // Update ticket with transaction
  const updatedTicket = await prisma.$transaction(async (tx) => {
    // Handle tags separately
    const { tag_ids, ...rest } = updates;
    const ticket = await tx.ticket.update({
      where: { id: parseInt(id) },
      data: {
        ...rest,
        ...statusUpdates,
        updated_at: now
      },
      include: {
        priority: true,
        assignee: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Create ticket events for changes
    const events = [];

    if (updates.status && updates.status !== existingTicket.status) {
      events.push({
        ticket_id: ticket.id,
        user_id: req.user.id,
        change_type: 'status_changed',
        old_value: existingTicket.status,
        new_value: updates.status
      });
    }

    if (updates.assignee_id !== undefined && updates.assignee_id !== existingTicket.assignee_id) {
      events.push({
        ticket_id: ticket.id,
        user_id: req.user.id,
        change_type: 'assignee_changed',
        old_value: existingTicket.assignee_id?.toString() || null,
        new_value: updates.assignee_id?.toString() || null
      });
    }

    if (updates.priority_id && updates.priority_id !== existingTicket.priority_id) {
      events.push({
        ticket_id: ticket.id,
        user_id: req.user.id,
        change_type: 'priority_changed',
        old_value: existingTicket.priority_id.toString(),
        new_value: updates.priority_id.toString()
      });
    }

    if (events.length > 0) {
      await tx.ticketEvent.createMany({
        data: events
      });
    }

    // Handle tags if provided
    if (tag_ids) {
      // Remove existing tags
      await tx.ticketTag.deleteMany({
        where: { ticket_id: ticket.id }
      });

      // Add new tags
      if (tag_ids.length > 0) {
        await tx.ticketTag.createMany({
          data: tag_ids.map(tag_id => ({
            ticket_id: ticket.id,
            tag_id
          }))
        });
      }
    }

    return ticket;
  });

  const response = ApiResponse.success(
    { ticket: updatedTicket },
    'Ticket updated successfully'
  );

  return res.status(response.statusCode).json(response);
});

export const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, is_internal = false } = req.body;

  // Get ticket
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) }
  });

  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  // Check access - customers can only add non-internal comments
  if (req.user.role === 'customer' && is_internal) {
    throw ApiError.forbidden('Customers cannot add internal comments');
  }

  if (!hasTicketUpdateAccess(req.user, ticket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  // Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      is_internal,
      ticket_id: parseInt(id),
      author_id: req.user.id
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
    }
  });

  // Create ticket event for comment
  await prisma.ticketEvent.create({
    data: {
      ticket_id: parseInt(id),
      user_id: req.user.id,
      change_type: 'comment_added',
      new_value: `Comment: ${content.substring(0, 50)}...`
    }
  });

  const response = ApiResponse.created(
    { comment },
    'Comment added successfully'
  );

  return res.status(response.statusCode).json(response);
});

// Upload image attachment to a ticket (admin, agent)
export const uploadTicketImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  if (!hasTicketUpdateAccess(req.user, ticket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  if (!req.file) {
    throw ApiError.badRequest('No image file provided');
  }

  // Upload to Cloudinary using buffer
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'resolvet/tickets', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(req.file.buffer);
  });

  const attachment = await prisma.attachment.create({
    data: {
      original_filename: req.file.originalname,
      stored_filename: uploadResult.secure_url,
      mime_type: req.file.mimetype,
      size: BigInt(req.file.size),
      ticket_id: ticket.id,
      uploaded_by_id: req.user.id
    }
  });

  await prisma.ticketEvent.create({
    data: {
      ticket_id: ticket.id,
      user_id: req.user.id,
      change_type: 'attachment_added',
      new_value: attachment.stored_filename
    }
  });

  const response = ApiResponse.created({ attachment }, 'Image uploaded successfully');
  return res.status(response.statusCode).json(response);
});

// Upload multiple image attachments
export const uploadTicketImages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  if (!hasTicketUpdateAccess(req.user, ticket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No image files provided');
  }

  const uploads = await Promise.all(req.files.map(file => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'resolvet/tickets', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ result, file });
      }
    );
    stream.end(file.buffer);
  })));

  const created = await prisma.$transaction(async (tx) => {
    const createdAttachments = await Promise.all(uploads.map(({ result, file }) => tx.attachment.create({
      data: {
        original_filename: file.originalname,
        stored_filename: result.secure_url,
        mime_type: file.mimetype,
        size: BigInt(file.size),
        ticket_id: ticket.id,
        uploaded_by_id: req.user.id
      }
    })));

    await tx.ticketEvent.createMany({
      data: createdAttachments.map(a => ({
        ticket_id: ticket.id,
        user_id: req.user.id,
        change_type: 'attachment_added',
        new_value: a.stored_filename
      }))
    });

    return createdAttachments;
  });

  const response = ApiResponse.created({ attachments: created }, 'Images uploaded successfully');
  return res.status(response.statusCode).json(response);
});

// Delete an attachment from a ticket (admin, agent)
export const deleteTicketAttachment = asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }
  if (!hasTicketUpdateAccess(req.user, ticket)) {
    throw ApiError.forbidden('Access denied to this ticket');
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: parseInt(attachmentId) } });
  if (!attachment || attachment.ticket_id !== ticket.id) {
    throw ApiError.notFound('Attachment not found for this ticket');
  }

  // Best-effort delete from Cloudinary if URL contains public_id pattern
  try {
    const urlParts = attachment.stored_filename.split('/');
    const publicIdWithExt = urlParts.slice(urlParts.indexOf('resolvet'), urlParts.length).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch {}

  await prisma.attachment.delete({ where: { id: attachment.id } });

  await prisma.ticketEvent.create({
    data: {
      ticket_id: ticket.id,
      user_id: req.user.id,
      change_type: 'attachment_deleted',
      old_value: attachment.stored_filename
    }
  });

  const response = ApiResponse.success({}, 'Attachment deleted successfully');
  return res.status(response.statusCode).json(response);
});

// Temporary upload for images before ticket exists; returns urls only
export const uploadTempTicketImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No image files provided');
  }
  // Files are already uploaded to cloudinary by multer storage; each file has path/secure_url
  const urls = req.files.map((f) => f.path || f.secure_url).filter(Boolean);
  const response = ApiResponse.success({ urls: Array.from(new Set(urls)) }, 'Images uploaded');
  return res.status(response.statusCode).json(response);
});

export const getTicketStats = asyncHandler(async (req, res) => {
  // Role-based filtering
  const where = {};
  
  if (req.user.role === 'agent') {
    where.assignee_id = req.user.id;
  } else if (req.user.role === 'customer') {
    where.created_by_id = req.user.id;
  }

  const stats = await prisma.ticket.groupBy({
    by: ['status'],
    where,
    _count: {
      id: true
    }
  });

  // Get counts by priority
  const priorityStats = await prisma.ticket.groupBy({
    by: ['priority_id'],
    where,
    _count: {
      id: true
    }
  });

  // Get recent tickets count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentStats = await prisma.ticket.groupBy({
    by: ['status'],
    where: {
      ...where,
      created_at: {
        gte: sevenDaysAgo
      }
    },
    _count: {
      id: true
    }
  });

  // Format response
  const formattedStats = {
    byStatus: {},
    byPriority: {},
    recent: {},
    total: await prisma.ticket.count({ where })
  };

  stats.forEach(stat => {
    formattedStats.byStatus[stat.status] = stat._count.id;
  });

  priorityStats.forEach(stat => {
    formattedStats.byPriority[stat.priority_id] = stat._count.id;
  });

  recentStats.forEach(stat => {
    formattedStats.recent[stat.status] = stat._count.id;
  });

  const response = ApiResponse.success(
    { stats: formattedStats },
    'Ticket statistics retrieved successfully'
  );

  return res.status(response.statusCode).json(response);
});

// Ticket priorities CRUD
export const getTicketPriorities = asyncHandler(async (req, res) => {
  const priorities = await prisma.ticketPriority.findMany({
    orderBy: { id: 'asc' }
  });
  const response = ApiResponse.success(
    { priorities },
    'Ticket priorities retrieved successfully'
  );
  return res.status(response.statusCode).json(response);
});

export const createTicketPriority = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Priority name is required');
  }
  const created = await prisma.ticketPriority.create({ data: { name: name.trim() } });
  const response = ApiResponse.created({ priority: created }, 'Priority created successfully');
  return res.status(response.statusCode).json(response);
});

export const updateTicketPriority = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const priorityId = parseInt(id);
  if (!Number.isFinite(priorityId)) {
    throw ApiError.badRequest('Invalid priority id');
  }
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Priority name is required');
  }
  const updated = await prisma.ticketPriority.update({
    where: { id: priorityId },
    data: { name: name.trim() }
  });
  const response = ApiResponse.success({ priority: updated }, 'Priority updated successfully');
  return res.status(response.statusCode).json(response);
});

export const deleteTicketPriority = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const priorityId = parseInt(id);
  if (!Number.isFinite(priorityId)) {
    throw ApiError.badRequest('Invalid priority id');
  }
  await prisma.ticketPriority.delete({ where: { id: priorityId } });
  const response = ApiResponse.success({}, 'Priority deleted successfully');
  return res.status(response.statusCode).json(response);
});