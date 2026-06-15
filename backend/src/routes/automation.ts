import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsApp } from '../lib/whatsappSend';
import { sendEmail, templates } from '../lib/email';

const router = Router();
router.use(authenticate);

// Resolve the Google review link (full link or built from Place ID).
async function getReviewLink() {
  const gb = await prisma.socialAccount.findUnique({ where: { platform: 'GOOGLE_BUSINESS' } }).catch(() => null);
  return gb?.profileUrl || (gb?.accountId ? `https://search.google.com/local/writereview?placeid=${gb.accountId}` : null);
}

router.get('/', async (_req, res) => {
  const workflows = await prisma.automationWorkflow.findMany({
    include: { _count: { select: { executions: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(workflows);
});

router.get('/:id', async (req, res) => {
  const workflow = await prisma.automationWorkflow.findUnique({
    where: { id: req.params.id },
    include: { executions: { orderBy: { startedAt: 'desc' }, take: 10 } },
  });
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
});

router.post('/', async (req, res) => {
  const workflow = await prisma.automationWorkflow.create({ data: req.body });
  res.status(201).json(workflow);
});

router.put('/:id', async (req, res) => {
  const workflow = await prisma.automationWorkflow.update({ where: { id: req.params.id }, data: req.body });
  res.json(workflow);
});

router.post('/:id/toggle', async (req, res) => {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { id: req.params.id } });
  if (!workflow) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.automationWorkflow.update({
    where: { id: req.params.id },
    data: { isActive: !workflow.isActive },
  });
  res.json(updated);
});

// Manually run a workflow (test execution). Records a run and reports the actions.
// Find the bookings/guests a trigger applies to, right now.
async function findTargets(event: string) {
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const tomA = new Date(startToday); tomA.setDate(tomA.getDate() + 1);
  const tomB = new Date(endToday); tomB.setDate(tomB.getDate() + 1);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const inc = { guest: true, unit: true } as const;
  let where: any; let stage: string;
  switch (event) {
    case 'DAY_BEFORE_ARRIVAL': where = { checkIn: { gte: tomA, lte: tomB }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }; stage = 'Arriving'; break;
    case 'CHECK_IN_PLUS_2H': where = { checkIn: { gte: startToday, lte: endToday } }; stage = 'Checked In'; break;
    case 'MID_STAY': where = { checkIn: { lt: startToday }, checkOut: { gt: endToday }, status: { in: ['CHECKED_IN', 'CONFIRMED'] } }; stage = 'Staying'; break;
    case 'CHECKOUT_DAY': where = { checkOut: { gte: startToday, lte: endToday } }; stage = 'Checked Out'; break;
    case 'AFTER_CHECKOUT': where = { checkOut: { gte: weekAgo, lte: endToday } }; stage = 'Review Pending'; break;
    case 'BOOKING_CREATED': default: where = { createdAt: { gte: weekAgo } }; stage = 'Booked'; break;
  }
  const bookings = await prisma.booking.findMany({ where, include: inc, orderBy: { updatedAt: 'desc' }, take: 25 });
  return bookings.map(b => ({ bookingId: b.id, guestId: b.guestId, guest: `${b.guest.firstName} ${b.guest.lastName}`, firstName: b.guest.firstName, email: b.guest.email, phone: b.guest.whatsapp || b.guest.phone, unit: b.unit?.name ?? '', stage, reference: b.referenceNumber }));
}

router.post('/:id/run', async (req: any, res) => {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { id: req.params.id } });
  if (!workflow) return res.status(404).json({ error: 'Not found' });

  const parse = (v: any) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; } };
  const trigger = parse(workflow.trigger) ?? {};
  const actions: any[] = parse(workflow.actions) ?? [];
  const event = trigger?.event ?? 'BOOKING_CREATED';

  const targets = await findTargets(event);
  const reviewLink = await getReviewLink();
  const results: any[] = [];

  // Apply each action to each matched client.
  for (const t of targets) {
    for (const a of actions) {
      if (a.type === 'SEND_WHATSAPP') {
        const slug = a.config?.template ? `/${a.config.template}` : '';
        const body = `[Automation: ${workflow.name}] ${slug} message sent to ${t.guest}.`;
        await prisma.whatsAppMessage.create({ data: { guestId: t.guestId, direction: 'OUTBOUND', body, status: 'SENT', templateId: a.config?.template ?? null } }).catch(() => {});
        results.push({ client: t.guest, stage: t.stage, action: `WhatsApp ${slug || 'message'}`, reference: t.reference });
      } else if (a.type === 'NOTIFY_TEAM') {
        results.push({ client: t.guest, stage: t.stage, action: 'Team notified', reference: t.reference });
      } else if (a.type === 'SCHEDULE_REVIEW' || a.type === 'SEND_REVIEW_REQUEST') {
        // Actually send the review request (email + WhatsApp) with the Google review link.
        const link = reviewLink;
        let how = 'no review link set';
        if (link) {
          const waMsg = `Hi ${t.firstName}, thank you for staying at Silent Palms Villa! 🌴 We'd love a quick Google review: ${link}`;
          const wa = await sendWhatsApp(t.phone, waMsg).catch(() => ({ ok: false } as any));
          if (wa.ok) await prisma.whatsAppMessage.create({ data: { guestId: t.guestId, direction: 'OUTBOUND', body: waMsg, status: 'SENT' } }).catch(() => {});
          const em = t.email ? await sendEmail(t.email, 'How was your stay at Silent Palms? ⭐', templates.reviewRequest({ firstName: t.firstName }, link)).catch(() => ({ ok: false } as any)) : { ok: false };
          how = [wa.ok && 'WhatsApp', em.ok && 'email'].filter(Boolean).join(' + ') || 'queued (channels not connected)';
        }
        results.push({ client: t.guest, stage: t.stage, action: `Review request → ${how}`, reference: t.reference });
      } else {
        results.push({ client: t.guest, stage: t.stage, action: (a.type ?? 'action').replace(/_/g, ' '), reference: t.reference });
      }
    }
    if (actions.length === 0) results.push({ client: t.guest, stage: t.stage, action: 'matched (no actions)', reference: t.reference });
  }

  // Notify managers once with a summary.
  if (results.length) {
    const mgrs = await prisma.user.findMany({ where: { role: { name: { in: ['SUPER_ADMIN', 'PROPERTY_MANAGER'] } }, isActive: true }, select: { id: true } });
    await prisma.notification.createMany({ data: mgrs.map(m => ({ userId: m.id, title: `Automation ran: ${workflow.name}`, body: `${targets.length} client(s) processed`, type: 'AUTOMATION' })) }).catch(() => {});
  }

  await prisma.automationWorkflow.update({ where: { id: req.params.id }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } });
  await prisma.workflowExecution.create({
    data: { workflowId: workflow.id, status: 'SUCCESS', context: JSON.stringify({ event, clients: targets.length, results: results.slice(0, 25) }), completedAt: new Date() },
  }).catch(() => {});

  res.json({
    success: true,
    trigger: event,
    clientsProcessed: targets.length,
    results,
    message: targets.length ? `Ran on ${targets.length} client(s).` : 'Ran — no clients currently match this trigger.',
  });
});

// Execution history for a workflow.
router.get('/:id/executions', async (req, res) => {
  const execs = await prisma.workflowExecution.findMany({ where: { workflowId: req.params.id }, orderBy: { startedAt: 'desc' }, take: 20 });
  res.json(execs.map(e => ({ id: e.id, status: e.status, startedAt: e.startedAt, context: (() => { try { return JSON.parse(e.context || '{}'); } catch { return {}; } })() })));
});

// Default workflows seed data
router.post('/seed-defaults', async (_req, res) => {
  const defaults = [
    {
      name: 'Booking Confirmation',
      trigger: JSON.stringify({ event: 'BOOKING_CREATED' }),
      actions: JSON.stringify([
        { type: 'CREATE_GUEST', config: {} },
        { type: 'SEND_WHATSAPP', config: { template: 'booking_confirmation' } },
        { type: 'UPDATE_REVENUE', config: {} },
        { type: 'NOTIFY_TEAM', config: { channels: ['email'] } },
      ]),
    },
    {
      name: 'Pre-Arrival (Day Before)',
      trigger: JSON.stringify({ event: 'DAY_BEFORE_ARRIVAL' }),
      actions: JSON.stringify([{ type: 'SEND_WHATSAPP', config: { template: 'arrival_info' } }]),
    },
    {
      name: 'Post Check-In Welfare Check',
      trigger: JSON.stringify({ event: 'CHECK_IN_PLUS_2H' }),
      actions: JSON.stringify([{ type: 'SEND_WHATSAPP', config: { template: 'welfare_check' } }]),
    },
    {
      name: 'Mid-Stay Upsell',
      trigger: JSON.stringify({ event: 'MID_STAY' }),
      actions: JSON.stringify([{ type: 'SEND_WHATSAPP', config: { template: 'upsell_offer' } }]),
    },
    {
      name: 'Checkout Message',
      trigger: JSON.stringify({ event: 'CHECKOUT_DAY' }),
      actions: JSON.stringify([{ type: 'SEND_WHATSAPP', config: { template: 'checkout' } }]),
    },
    {
      name: 'Review Request',
      trigger: JSON.stringify({ event: 'AFTER_CHECKOUT', config: { delayHours: 24 } }),
      actions: JSON.stringify([{ type: 'SEND_WHATSAPP', config: { template: 'review_request' } }]),
    },
  ];

  const created = await Promise.all(defaults.map(d => prisma.automationWorkflow.create({ data: d })));
  res.json({ message: `${created.length} workflows created`, data: created });
});

export default router;
