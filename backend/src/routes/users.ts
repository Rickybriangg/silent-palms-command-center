import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// List all roles (for the Add Staff form)
router.get('/roles', authenticate, async (_req: AuthRequest, res: Response) => {
  const roles = await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  res.json(roles);
});

// List all team members
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, firstName: true, lastName: true, avatar: true,
      phone: true, isActive: true, lastLoginAt: true, createdAt: true,
      role: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// Update a staff member's role or active status (admin only).
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user!.id && req.body.isActive === false) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  const { roleId, isActive, firstName, lastName, phone } = req.body ?? {};
  if (roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(400).json({ error: 'Invalid role' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(roleId ? { roleId } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, role: { select: { name: true } } },
  });
  res.json(user);
});

// Remove a staff member (admin only). Cannot remove yourself.
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user!.id) return res.status(400).json({ error: 'You cannot remove your own account' });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
