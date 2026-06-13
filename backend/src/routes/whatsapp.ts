import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsApp } from '../lib/whatsappSend';

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
  const { guestId, body, templateId, mediaUrl } = req.body ?? {};
  if (!guestId || !body) return res.status(400).json({ error: 'guestId and body are required' });

  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  // Attempt real delivery via the WhatsApp Cloud API.
  const result = await sendWhatsApp(guest.whatsapp || guest.phone, body);

  // Record the message regardless, so the conversation thread stays accurate.
  const message = await prisma.whatsAppMessage.create({
    data: {
      guestId,
      direction: 'OUTBOUND',
      body,
      templateId: templateId || null,
      mediaUrl: mediaUrl || null,
      status: result.ok ? 'SENT' : (result.connected ? 'FAILED' : 'PENDING'),
      messageId: result.externalId || null,
    },
  });

  res.status(201).json({
    message,
    delivered: result.ok,
    note: result.ok
      ? 'Delivered via WhatsApp.'
      : result.error,
  });
});

// CRM Pipeline — guests grouped into stages derived from their bookings.
const PIPELINE_STAGES = ['NEW_ENQUIRY', 'QUOTE_SENT', 'BOOKED', 'ARRIVING', 'STAYING', 'CHECKED_OUT', 'REVIEW_PENDING', 'REPEAT_GUEST'];

// Map a guest (with their bookings) to a single pipeline stage.
function deriveStage(guest: any): string {
  const bookings = guest.bookings ?? [];
  if (bookings.length === 0) {
    // No bookings yet: a lead/enquiry. A sent quote is signalled by a tag.
    const tags = (() => { try { return JSON.parse(guest.tags || '[]'); } catch { return []; } })();
    return tags.includes('quote_sent') ? 'QUOTE_SENT' : 'NEW_ENQUIRY';
  }
  if (bookings.length > 1 && bookings.some((b: any) => b.status === 'CHECKED_OUT')) return 'REPEAT_GUEST';
  // Use the most relevant current booking status.
  const statuses = bookings.map((b: any) => b.status);
  if (statuses.includes('CHECKED_IN')) return 'STAYING';
  if (statuses.includes('ARRIVING')) return 'ARRIVING';
  if (statuses.includes('CONFIRMED') || statuses.includes('PENDING')) return 'BOOKED';
  if (statuses.includes('CHECKED_OUT')) return 'REVIEW_PENDING';
  return 'BOOKED';
}

router.get('/pipeline', async (_req, res) => {
  const guests = await prisma.guest.findMany({
    include: {
      bookings: { select: { status: true } },
      _count: { select: { bookings: true } },
    },
    take: 200,
  });

  const pipeline: Record<string, any[]> = {};
  for (const stage of PIPELINE_STAGES) pipeline[stage] = [];
  for (const guest of guests) {
    const stage = deriveStage(guest);
    pipeline[stage].push({
      id: guest.id, firstName: guest.firstName, lastName: guest.lastName,
      phone: guest.phone, _count: guest._count,
    });
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
