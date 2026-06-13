import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query as Record<string, string>;
  const where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: { labels: true, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.guest.count({ where }),
  ]);
  res.json({ data: guests, total });
});

router.get('/:id', async (req, res) => {
  const guest = await prisma.guest.findUnique({
    where: { id: req.params.id },
    include: { bookings: { include: { unit: true }, orderBy: { checkIn: 'desc' } }, labels: true, reviews: true },
  });
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

router.post('/', async (req, res) => {
  const guest = await prisma.guest.create({ data: req.body });
  res.status(201).json(guest);
});

router.put('/:id', async (req, res) => {
  const guest = await prisma.guest.update({ where: { id: req.params.id }, data: req.body });
  res.json(guest);
});

router.post('/:id/labels', async (req, res) => {
  const label = await prisma.guestLabel.create({ data: { guestId: req.params.id, ...req.body } });
  res.status(201).json(label);
});

export default router;
