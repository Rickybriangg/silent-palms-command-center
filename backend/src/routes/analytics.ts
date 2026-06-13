import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/booking-funnel', async (_req, res) => {
  const [total, confirmed, checkedIn, checkedOut] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'ARRIVING', 'CHECKED_IN', 'CHECKED_OUT'] } } }),
    prisma.booking.count({ where: { status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } } }),
    prisma.booking.count({ where: { status: 'CHECKED_OUT' } }),
  ]);
  res.json([
    { stage: 'Enquiries', count: total, percentage: 100 },
    { stage: 'Bookings Confirmed', count: confirmed, percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0 },
    { stage: 'Checked In', count: checkedIn, percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0 },
    { stage: 'Completed Stays', count: checkedOut, percentage: total > 0 ? Math.round((checkedOut / total) * 100) : 0 },
  ]);
});

router.get('/channel-performance', async (_req, res) => {
  const data = await prisma.booking.groupBy({
    by: ['channel'],
    _count: true,
    _sum: { totalAmount: true },
  });
  res.json(data.map(d => ({
    channel: d.channel,
    bookings: d._count,
    revenue: Number(d._sum.totalAmount ?? 0),
  })));
});

export default router;
