import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const { period = 'month' } = req.query as { period: string };
  const now = new Date();
  const start = period === 'year' ? startOfYear(now) : startOfMonth(now);
  const end = period === 'year' ? endOfYear(now) : endOfMonth(now);

  const [revenue, expenses, bookings] = await Promise.all([
    prisma.revenue.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.booking.findMany({
      where: { checkIn: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      select: { totalAmount: true, nights: true, unitId: true },
    }),
  ]);

  const rev = Number(revenue._sum.amount ?? 0);
  const exp = Number(expenses._sum.amount ?? 0);
  const totalNights = bookings.reduce((s: number, b) => s + b.nights, 0);
  const totalUnits = await prisma.unit.count({ where: { isActive: true } });
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const adr = bookings.length > 0 ? bookings.reduce((s: number, b) => s + Number(b.totalAmount), 0) / bookings.length : 0;
  const occupancy = totalUnits > 0 ? (totalNights / (totalUnits * daysInPeriod)) * 100 : 0;

  res.json({
    revenue: rev,
    expenses: exp,
    profit: rev - exp,
    adr: Math.round(adr),
    revpar: Math.round(adr * occupancy / 100),
    occupancy: Math.round(occupancy * 10) / 10,
    roi: exp > 0 ? Math.round(((rev - exp) / exp) * 100) : 0,
  });
});

router.get('/', async (req, res) => {
  const { page = 1, limit = 50 } = req.query as Record<string, string>;
  const [data, total] = await Promise.all([
    prisma.revenue.findMany({
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.revenue.count(),
  ]);
  res.json({ data, total });
});

router.post('/', async (req, res) => {
  const entry = await prisma.revenue.create({ data: req.body });
  res.status(201).json(entry);
});

router.get('/expenses', async (_req, res) => {
  const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
  res.json(expenses);
});

router.post('/expenses', async (req, res) => {
  const expense = await prisma.expense.create({ data: req.body });
  res.status(201).json(expense);
});

router.get('/forecast', async (_req, res) => {
  // Simple linear regression forecast over last 6 months
  const now = new Date();
  const history: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(subMonths(now, i));
    const rev = await prisma.revenue.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } });
    history.push(Number(rev._sum.amount ?? 0));
  }
  // Average growth rate
  const growthRates = history.slice(1).map((v: number, i: number) => history[i] > 0 ? (v - history[i]) / history[i] : 0);
  const avgGrowth = growthRates.reduce((a: number, b: number) => a + b, 0) / growthRates.length;
  const lastRevenue = history[history.length - 1];

  const forecast: { month: string; forecast: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecast.push({
      month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
      forecast: Math.round(lastRevenue * Math.pow(1 + avgGrowth, i)),
    });
  }
  res.json({ history, forecast, avgGrowthRate: Math.round(avgGrowth * 100) });
});

export default router;
