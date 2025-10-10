import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { sendEmail, inviteEmailTemplate } from '../utils/mailer.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

const INVITE_DEFAULT_EXP_HOURS = 72;

const signInviteToken = (payload) => {
  return jwt.sign(payload, process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET, {
    expiresIn: `${payload.expiresInHours || INVITE_DEFAULT_EXP_HOURS}h`
  });
};

export const createInvite = async (req, res, next) => {
  try {
    const { email, role, expiresInHours } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const hours = Number(expiresInHours) > 0 ? Number(expiresInHours) : INVITE_DEFAULT_EXP_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Note: do not auto-revoke existing pending invites to avoid breaking older invite links

    const rawToken = crypto.randomUUID();

    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        role,
        token: rawToken,
        expires_at: expiresAt,
        status: 'PENDING'
      },
      select: { id: true, email: true, role: true, token: true, expires_at: true, status: true }
    });

    const signed = signInviteToken({
      inviteId: invite.id,
      email: invite.email,
      role: invite.role,
      expiresInHours: hours
    });

    const acceptUrlBase = process.env.CLIENT_DEPLOYED_URL || 'https://resolvety.vercel.app/';
    const acceptUrl = `${acceptUrlBase}/auth/invite/accept?token=${encodeURIComponent(signed)}`;

    // Send email via provider or JSON transport fallback
    try {
      await sendEmail({
        to: invite.email,
        subject: `You're invited to Resolvet as ${invite.role}`,
        html: inviteEmailTemplate({ role: invite.role, acceptUrl, expiry: invite.expires_at }),
        text: `You have been invited as ${invite.role}. Accept: ${acceptUrl}`,
      });
    } catch (e) {
      // do not fail the request on email send error; log instead
      console.error('Invite email send error:', e?.message || e);
    }

    return res.status(201).json(ApiResponse.success({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expires_at,
      acceptUrl
    }, 'Invite created'));
  } catch (error) {
    next(error);
  }
};

export const listInvites = async (req, res, next) => {
  try {
    const { status, email, page = 1, pageSize = 20 } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      ...(status ? { status } : {}),
      ...(email ? { email: String(email).toLowerCase() } : {})
    };

    const [items, total] = await Promise.all([
      prisma.invite.findMany({ where, orderBy: { created_at: 'desc' }, skip, take }),
      prisma.invite.count({ where })
    ]);

    return res.json(ApiResponse.success({ items, total, page: Number(page) || 1, pageSize: take }));
  } catch (error) {
    next(error);
  }
};

export const resendInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invite = await prisma.invite.findUnique({ where: { id: Number(id) } });
    if (!invite) return next(ApiError.notFound('Invite not found'));
    if (invite.status === 'ACCEPTED' || invite.status === 'REVOKED') {
      return next(ApiError.conflict('Invite already finalized'));
    }

    // Renew expiry and rotate token
    const hours = INVITE_DEFAULT_EXP_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const rawToken = crypto.randomUUID();

    const updated = await prisma.invite.update({
      where: { id: invite.id },
      data: { token: rawToken, expires_at: expiresAt, status: 'PENDING' }
    });

    const signed = signInviteToken({
      inviteId: updated.id,
      email: updated.email,
      role: updated.role,
      expiresInHours: hours
    });

    const acceptUrlBase = process.env.CLIENT_DEPLOYED_URL || 'https://resolvety.vercel.app/';
    const acceptUrl = `${acceptUrlBase}/auth/invite/accept?token=${encodeURIComponent(signed)}`;

    try {
      await sendEmail({
        to: updated.email,
        subject: `Your Resolvet invitation link (resend)` ,
        html: inviteEmailTemplate({ role: updated.role, acceptUrl, expiry: updated.expires_at }),
        text: `Accept your invitation: ${acceptUrl}`,
      });
    } catch (e) {
      console.error('Resend invite email error:', e?.message || e);
    }

    return res.json(ApiResponse.success({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expires_at,
      acceptUrl
    }, 'Invite resent'));
  } catch (error) {
    next(error);
  }
};

export const revokeInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invite = await prisma.invite.findUnique({ where: { id: Number(id) } });
    if (!invite) return next(ApiError.notFound('Invite not found'));
    if (invite.status !== 'PENDING') {
      return next(ApiError.conflict('Only pending invites can be revoked'));
    }
    const updated = await prisma.invite.update({ where: { id: invite.id }, data: { status: 'REVOKED' } });
    return res.json(ApiResponse.success(updated, 'Invite revoked'));
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    if (!token) return next(ApiError.badRequest('Token is required'));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET);
    } catch (e) {
      return next(ApiError.badRequest('Invalid or expired invite token'));
    }

    const { inviteId, email, role } = decoded;
    const invite = await prisma.invite.findUnique({ where: { id: Number(inviteId) } });
    if (!invite) return next(ApiError.notFound('Invite not found'));

    if (invite.status !== 'PENDING') return next(ApiError.conflict('Invite not pending'));
    if (invite.expires_at < new Date()) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      return next(ApiError.gone('Invite expired'));
    }

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    let user;
    if (existing) {
      if (existing.role !== role) {
        user = await prisma.user.update({ where: { id: existing.id }, data: { role } });
      } else {
        user = existing;
      }
    } else {
      if (!name || !password) return next(ApiError.badRequest('Name and password are required'));
      const [first, ...rest] = String(name).trim().split(' ');
      const last = rest.join(' ') || '-';
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash(password, 12);

      user = await prisma.user.create({
        data: {
          email: invite.email,
          password_hash: hash,
          first_name: first,
          last_name: last,
          role
        }
      });
    }

    await prisma.invite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', accepted_at: new Date() } });

    const { generateToken } = await import('../utils/generateToken.js');
    const authToken = generateToken(user.id, user.role);

    return res.json(ApiResponse.success({ user: { id: user.id, email: user.email, role: user.role }, token: authToken }, 'Invite accepted'));
  } catch (error) {
    next(error);
  }
};


