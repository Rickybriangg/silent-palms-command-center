import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, assigneeId, priority } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;
  if (priority) where.priority = priority;

  const tasks = await prisma.task.findMany({
    where,
    include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
  res.json(tasks);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.create({
    data: { ...req.body, createdById: req.user!.id },
    include: { assignee: true },
  });
  res.status(201).json(task);
});

router.put('/:id', async (req, res) => {
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: req.body,
    include: { assignee: true },
  });
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted' });
});

export default router;
