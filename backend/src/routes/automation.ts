import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

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
