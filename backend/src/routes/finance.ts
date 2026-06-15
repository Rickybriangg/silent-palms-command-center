// ============================================================
// Finance & Staff Access Management Plugin — additive route module.
// Reuses the existing auth middleware, Prisma connection, AuditLog and User
// records. Mounted at /api/v1/finance. Does not touch existing endpoints.
// ============================================================
import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

const router = Router();
router.use(authenticate);

const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

// Reuse existing AuditLog table for the plugin's activity trail.
async function audit(req: AuthRequest, action: string, entity: string, entityId?: string, newData?: any) {
  try {
    await prisma.auditLog.create({
      data: { userId: req.user?.id ?? null, action, entity, entityId: entityId ?? null, newData: newData ? JSON.stringify(newData) : null },
    });
  } catch { /* non-fatal */ }
}

// Load a user's explicit restriction (overlay on top of role permissions).
async function hasRestriction(userId: string, key: string) {
  const r = await prisma.userRestriction.findUnique({ where: { userId_key: { userId, key } } }).catch(() => null);
  return !!r;
}

// Gate: finance viewers (role-based) who are not explicitly restricted.
function requireFinanceView(req: AuthRequest, res: Response, next: NextFunction) {
  if (!FINANCE_ROLES.includes(req.user!.role)) return res.status(403).json({ error: 'Finance access is restricted to Finance Managers and Admins.' });
  hasRestriction(req.user!.id, 'NO_FINANCE_VIEW').then(restricted =>
    restricted ? res.status(403).json({ error: 'Your finance access has been restricted by an administrator.' }) : next()
  );
}

// ---------- Overview (Finance Dashboard summary) ----------
router.get('/overview', requireFinanceView, async (_req: AuthRequest, res) => {
  const now = new Date();
  const start = startOfMonth(now), end = endOfMonth(now);
  const inDate = { gte: start, lte: end };

  const [rev, exp, pendingApprovals, categories] = await Promise.all([
    prisma.revenue.aggregate({ where: { date: inDate }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: inDate }, _sum: { amount: true } }),
    prisma.expenseApproval.count({ where: { status: 'PENDING' } }),
    prisma.expenseCategory.findMany({ where: { isActive: true } }),
  ]);

  const expenses = await prisma.expense.findMany({ where: { date: inDate } });
  const spentByCat = new Map<string, number>();
  for (const e of expenses) spentByCat.set(e.category, (spentByCat.get(e.category) ?? 0) + Number(e.amount));
  const budgets = categories.map(c => ({ category: c.name, budget: c.monthlyBudget, spent: spentByCat.get(c.name) ?? 0, color: c.color }));

  const totalIn = Number(rev._sum.amount ?? 0);
  const totalOut = Number(exp._sum.amount ?? 0);
  res.json({ totalIn, totalOut, net: totalIn - totalOut, pendingApprovals, budgets });
});

// ---------- Expense Categories ----------
router.get('/categories', requireFinanceView, async (_req, res) => {
  res.json(await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }));
});
router.post('/categories', authorize('SUPER_ADMIN', 'FINANCE_MANAGER'), async (req: AuthRequest, res) => {
  const { name, monthlyBudget, color } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const cat = await prisma.expenseCategory.create({ data: { name, monthlyBudget: Number(monthlyBudget ?? 0), color: color || null } });
  await audit(req, 'CREATE', 'ExpenseCategory', cat.id, cat);
  res.status(201).json(cat);
});
router.put('/categories/:id', authorize('SUPER_ADMIN', 'FINANCE_MANAGER'), async (req: AuthRequest, res) => {
  const { name, monthlyBudget, color, isActive } = req.body ?? {};
  const cat = await prisma.expenseCategory.update({
    where: { id: req.params.id },
    data: { ...(name ? { name } : {}), ...(monthlyBudget != null ? { monthlyBudget: Number(monthlyBudget) } : {}), ...(color !== undefined ? { color } : {}), ...(typeof isActive === 'boolean' ? { isActive } : {}) },
  });
  res.json(cat);
});

// ---------- Expenses + Approval workflow ----------
router.get('/expenses', requireFinanceView, async (_req, res) => {
  const expenses = await prisma.expense.findMany({ include: { approval: true }, orderBy: { date: 'desc' }, take: 200 });
  res.json(expenses.map(e => ({
    id: e.id, category: e.category, amount: Number(e.amount), currency: e.currency, date: e.date,
    vendor: e.vendor, description: e.description,
    status: e.approval?.status ?? 'APPROVED',
    requestedBy: e.approval?.requestedBy, decidedBy: e.approval?.decidedBy, decidedAt: e.approval?.decidedAt, note: e.approval?.note,
  })));
});

// Submit a new expense for approval (any authenticated staff member).
router.post('/expenses', async (req: AuthRequest, res) => {
  const { category, amount, vendor, description, date, currency } = req.body ?? {};
  if (!category || amount == null) return res.status(400).json({ error: 'Category and amount are required' });
  const expense = await prisma.expense.create({
    data: { category, amount: Number(amount), vendor: vendor || null, description: description || null, currency: currency || 'KES', date: date ? new Date(date) : new Date() },
  });
  await prisma.expenseApproval.create({ data: { expenseId: expense.id, status: 'PENDING', requestedBy: req.user?.email ?? null } });
  await audit(req, 'SUBMIT', 'Expense', expense.id, { amount, category });

  const approvers = await prisma.user.findMany({ where: { role: { name: { in: FINANCE_ROLES } }, isActive: true }, select: { id: true } });
  await prisma.notification.createMany({
    data: approvers.map(a => ({ userId: a.id, title: 'Expense awaiting approval', body: `${category}: ${currency || 'USD'} ${Number(amount).toLocaleString()} submitted by ${req.user?.email}`, type: 'EXPENSE_APPROVAL', data: JSON.stringify({ expenseId: expense.id }) })),
  }).catch(() => {});

  res.status(201).json({ id: expense.id, status: 'PENDING' });
});

// Approve / reject an expense (finance/admin, unless restricted).
router.post('/expenses/:id/decide', authorize('SUPER_ADMIN', 'FINANCE_MANAGER'), async (req: AuthRequest, res) => {
  if (await hasRestriction(req.user!.id, 'NO_EXPENSE_APPROVE')) return res.status(403).json({ error: 'You are restricted from approving expenses.' });
  const { decision, note } = req.body ?? {};
  if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });

  const approval = await prisma.expenseApproval.upsert({
    where: { expenseId: req.params.id },
    update: { status: decision, decidedBy: req.user?.email ?? null, decidedAt: new Date(), note: note || null },
    create: { expenseId: req.params.id, status: decision, decidedBy: req.user?.email ?? null, decidedAt: new Date(), note: note || null },
  });
  await audit(req, decision, 'Expense', req.params.id, { note });
  res.json(approval);
});

// ---------- Finance Transactions ledger (unified inflow/outflow) ----------
router.get('/transactions', requireFinanceView, async (_req, res) => {
  const now = new Date();
  const inDate = { gte: startOfMonth(now), lte: endOfMonth(now) };
  const [revenue, expenses, manual] = await Promise.all([
    prisma.revenue.findMany({ where: { date: inDate }, orderBy: { date: 'desc' }, take: 100 }),
    prisma.expense.findMany({ where: { date: inDate }, orderBy: { date: 'desc' }, take: 100 }),
    prisma.financeTransaction.findMany({ where: { date: inDate }, orderBy: { date: 'desc' }, take: 100 }),
  ]);
  const tx = [
    ...revenue.map(r => ({ type: 'INFLOW', amount: Number(r.amount), category: r.category, description: r.description, date: r.date, source: 'Revenue' })),
    ...expenses.map(e => ({ type: 'OUTFLOW', amount: Number(e.amount), category: e.category, description: e.description, date: e.date, source: 'Expense' })),
    ...manual.map(m => ({ type: m.type, amount: Number(m.amount), category: m.category, description: m.description, date: m.date, source: 'Manual' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(tx);
});

router.post('/transactions', authorize('SUPER_ADMIN', 'FINANCE_MANAGER'), async (req: AuthRequest, res) => {
  const { type, amount, category, description, date } = req.body ?? {};
  if (!['INFLOW', 'OUTFLOW'].includes(type) || amount == null) return res.status(400).json({ error: 'type (INFLOW/OUTFLOW) and amount are required' });
  const tx = await prisma.financeTransaction.create({
    data: { type, amount: Number(amount), category: category || null, description: description || null, sourceType: 'MANUAL', recordedById: req.user?.id ?? null, date: date ? new Date(date) : new Date() },
  });
  await audit(req, 'CREATE', 'FinanceTransaction', tx.id, { type, amount });
  res.status(201).json(tx);
});

// ---------- Staff Access / Restrictions (admin only) ----------
const RESTRICTION_KEYS = ['NO_FINANCE_VIEW', 'NO_EXPENSE_APPROVE', 'NO_EXPORT', 'NO_DELETE', 'NO_STAFF_MANAGE'];

router.get('/restrictions', authorize('SUPER_ADMIN'), async (_req, res) => {
  const restrictions = await prisma.userRestriction.findMany({ include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } } } } });
  res.json({ keys: RESTRICTION_KEYS, restrictions });
});
router.post('/restrictions', authorize('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  const { userId, key } = req.body ?? {};
  if (!userId || !RESTRICTION_KEYS.includes(key)) return res.status(400).json({ error: 'Valid userId and restriction key required' });
  const r = await prisma.userRestriction.upsert({
    where: { userId_key: { userId, key } },
    update: {}, create: { userId, key, createdById: req.user?.id ?? null },
  });
  await audit(req, 'RESTRICT', 'User', userId, { key });
  res.status(201).json(r);
});
router.delete('/restrictions', authorize('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  const { userId, key } = req.body ?? {};
  await prisma.userRestriction.deleteMany({ where: { userId, key } });
  await audit(req, 'UNRESTRICT', 'User', userId, { key });
  res.json({ success: true });
});

// ---------- Audit trail (reuses existing AuditLog) ----------
router.get('/audit', authorize('SUPER_ADMIN', 'FINANCE_MANAGER'), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { entity: { in: ['Expense', 'ExpenseCategory', 'FinanceTransaction', 'User'] } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'desc' }, take: 50,
  });
  res.json(logs);
});

export default router;
