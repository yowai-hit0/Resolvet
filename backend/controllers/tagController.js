import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import prisma from '../config/database.js';

// Public: list all tags (used for ticket creation dropdowns)
export const listTags = asyncHandler(async (req, res) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' }
  });

  const response = ApiResponse.success({ tags }, 'Tags retrieved successfully');
  return res.status(response.statusCode).json(response);
});

// Admin: create a tag
export const createTag = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw ApiError.badRequest('Tag name must be at least 2 characters');
  }

  const normalizedName = name.trim();

  const existing = await prisma.tag.findUnique({ where: { name: normalizedName } });
  if (existing) {
    throw ApiError.badRequest('A tag with this name already exists');
  }

  const tag = await prisma.tag.create({ data: { name: normalizedName } });

  const response = ApiResponse.created({ tag }, 'Tag created successfully');
  return res.status(response.statusCode).json(response);
});

// Admin: update a tag
export const updateTag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const tagId = parseInt(id, 10);
  if (Number.isNaN(tagId)) {
    throw ApiError.badRequest('Invalid tag id');
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw ApiError.badRequest('Tag name must be at least 2 characters');
  }

  const normalizedName = name.trim();

  const tag = await prisma.tag.update({
    where: { id: tagId },
    data: { name: normalizedName }
  });

  const response = ApiResponse.success({ tag }, 'Tag updated successfully');
  return res.status(response.statusCode).json(response);
});

// Admin: delete a tag
export const deleteTag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tagId = parseInt(id, 10);
  if (Number.isNaN(tagId)) {
    throw ApiError.badRequest('Invalid tag id');
  }

  // Optionally ensure not used, or cascade delete via TicketTag relation
  // Here we rely on ON DELETE CASCADE on ticket_tags entries
  await prisma.tag.delete({ where: { id: tagId } });

  const response = ApiResponse.success({}, 'Tag deleted successfully');
  return res.status(response.statusCode).json(response);
});


