import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const signToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, include: { role: true } });
  if (!user || !user.isActive || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name } });
};

// Admin-only: create a staff member. Route enforces authenticate + SUPER_ADMIN.
export const register = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, roleId } = req.body ?? {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First and last name are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  // Validate the requested role; never trust an arbitrary roleId blindly.
  let resolvedRoleId = roleId;
  if (resolvedRoleId) {
    const role = await prisma.role.findUnique({ where: { id: resolvedRoleId } });
    if (!role) return res.status(400).json({ error: 'Invalid role' });
  } else {
    const defaultRole = await prisma.role.findUnique({ where: { name: 'GUEST_RELATIONS' } });
    if (!defaultRole) return res.status(400).json({ error: 'No default role configured' });
    resolvedRoleId = defaultRole.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, firstName, lastName, roleId: resolvedRoleId },
    include: { role: true },
  });
  res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name } });
};

export const me = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, firstName: true, lastName: true, avatar: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true, roleId: true, role: true },
  });
  res.json(user);
};

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const newToken = signToken(decoded.userId);
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};
