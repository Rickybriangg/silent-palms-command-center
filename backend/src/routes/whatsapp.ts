import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Templates
router.get('/templates', async (_req, res) => {
  const templates = await prisma.whatsAppTemplate.findMany({ where: { isActive: true } });
  res.json(templates);
});

router.post('/templates', async (req, res) => {
  const template = await prisma.whatsAppTemplate.create({ data: req.body });
  res.status(201).json(template);
});

router.put('/templates/:id', async (req, res) => {
  const template = await prisma.whatsAppTemplate.update({ where: { id: req.params.id }, data: req.body });
  res.json(template);
});

// Messages
router.get('/messages/:guestId', async (req, res) => {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { guestId: req.params.guestId },
    orderBy: { sentAt: 'asc' },
  });
  res.json(messages);
});

router.post('/send', async (req, res) => {
  const { guestId, body, templateId, mediaUrl } = req.body;
  // In production: call WhatsApp Business API here
  const message = await prisma.whatsAppMessage.create({
    data: { guestId, direction: 'OUTBOUND', body, templateId, mediaUrl, status: 'SENT' },
  });
  res.status(201).json(message);
});

// CRM Pipeline
router.get('/pipeline', async (_req, res) => {
  const statuses = ['NEW_ENQUIRY', 'QUOTE_SENT', 'BOOKED', 'ARRIVING', 'STAYING', 'CHECKED_OUT', 'REVIEW_PENDING', 'REPEAT_GUEST'];
  const pipeline: Record<string, any[]> = {};

  for (const status of statuses) {
    const guests = await prisma.guest.findMany({
      where: { tags: { contains: status } },
      include: { _count: { select: { bookings: true } } },
      take: 20,
    });
    pipeline[status] = guests;
  }
  res.json(pipeline);
});

router.get('/conversations', async (req, res) => {
  const { page = 1, search } = req.query as Record<string, string>;
  const where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  const guests = await prisma.guest.findMany({
    where,
    include: {
      whatsappMessages: { orderBy: { sentAt: 'desc' }, take: 1 },
      labels: true,
    },
    orderBy: { updatedAt: 'desc' },
    skip: (Number(page) - 1) * 20,
    take: 20,
  });
  res.json(guests);
});

export default router;
