import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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

export default router;
