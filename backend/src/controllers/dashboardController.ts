import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { startOfDay, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

export const getDashboardStats = async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    revenueToday,
    revenueThisMonth,
    revenueLastMonth,
    bookingsThisMonth,
    bookingsLastMonth,
    totalActiveGuests,
    activeBookings,
    occupancyData,
    whatsappLeads,
    activeCampaigns,
    reviewStats,
  ] = await Promise.all([
    // Revenue today
    prisma.revenue.aggregate({
      where: { date: { gte: todayStart } },
      _sum: { amount: true },
    }),
    // Revenue this month
    prisma.revenue.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    // Revenue last month (for growth calc)
    prisma.revenue.aggregate({
      where: { date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    // Bookings this month
    prisma.booking.count({ where: { createdAt: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } } }),
    // Bookings last month
    prisma.booking.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'CANCELLED' } } }),
    // Active guests
    prisma.guest.count(),
    // Active bookings (checked in)
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'ARRIVING'] } } }),
    // Occupancy data
    prisma.booking.findMany({
      where: { checkIn: { lte: monthEnd }, checkOut: { gte: monthStart }, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } },
      select: { checkIn: true, checkOut: true, nights: true },
    }),
    // WhatsApp leads
    prisma.guest.count({ where: { source: 'WHATSAPP', createdAt: { gte: monthStart } } }),
    // Active campaigns
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    // Review average
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);

  // Calculate booking channel split
  const channelBreakdown = await prisma.booking.groupBy({
    by: ['channel'],
    where: { createdAt: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
    _count: true,
  });

  const totalBookings = channelBreakdown.reduce((sum: number, c) => sum + c._count, 0);
  const directCount = channelBreakdown.find(c => c.channel === 'DIRECT')?._count ?? 0;
  const otaCount = channelBreakdown
    .filter(c => ['AIRBNB', 'BOOKING_COM', 'EXPEDIA'].includes(c.channel))
    .reduce((sum: number, c) => sum + c._count, 0);

  // Monthly growth
  const revThisMonth = Number(revenueThisMonth._sum.amount ?? 0);
  const revLastMonth = Number(revenueLastMonth._sum.amount ?? 0);
  const monthlyGrowth = revLastMonth > 0
    ? ((revThisMonth - revLastMonth) / revLastMonth) * 100
    : 0;

  // Occupancy rate: total nights booked / (units * days in month)
  const totalUnits = await prisma.unit.count({ where: { isActive: true } });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totalNightsBooked = occupancyData.reduce((sum: number, b) => sum + b.nights, 0);
  const occupancyRate = totalUnits > 0
    ? Math.min(100, (totalNightsBooked / (totalUnits * daysInMonth)) * 100)
    : 0;

  // Conversion rate
  const enquiries = await prisma.whatsAppMessage.count({
    where: { direction: 'INBOUND', sentAt: { gte: monthStart } }
  });
  const conversionRate = enquiries > 0 ? (bookingsThisMonth / enquiries) * 100 : 0;

  res.json({
    revenueToday: Number(revenueToday._sum.amount ?? 0),
    revenueThisMonth: revThisMonth,
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
    bookingsThisMonth,
    bookingGrowth: bookingsLastMonth > 0 ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100 : 0,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
    directBookingPct: totalBookings > 0 ? Math.round((directCount / totalBookings) * 100) : 0,
    otaBookingPct: totalBookings > 0 ? Math.round((otaCount / totalBookings) * 100) : 0,
    activeBookings,
    totalGuests: totalActiveGuests,
    whatsappLeads,
    activeCampaigns,
    guestSatisfaction: Math.round((reviewStats._avg.rating ?? 0) * 10) / 10,
    totalReviews: reviewStats._count,
    channelBreakdown,
  });
};

export const getRevenueChart = async (req: AuthRequest, res: Response) => {
  const { period = '12months' } = req.query as { period: string };
  const now = new Date();

  const months = period === '12months' ? 12 : period === '6months' ? 6 : 3;
  const data: { month: string; revenue: number; expenses: number; profit: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(subMonths(now, i));
    const revenue = await prisma.revenue.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const expenses = await prisma.expense.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    data.push({
      month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: Number(revenue._sum.amount ?? 0),
      expenses: Number(expenses._sum.amount ?? 0),
      profit: Number(revenue._sum.amount ?? 0) - Number(expenses._sum.amount ?? 0),
    });
  }

  res.json(data);
};

export const getOccupancyHeatmap = async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const yearStart = startOfYear(now);

  const bookings = await prisma.booking.findMany({
    where: { checkIn: { gte: yearStart }, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } },
    select: { checkIn: true, checkOut: true, unitId: true },
  });

  // Build date → occupancy count map
  const heatmap: Record<string, number> = {};
  for (const b of bookings) {
    const d = new Date(b.checkIn);
    while (d < b.checkOut) {
      const key = d.toISOString().slice(0, 10);
      heatmap[key] = (heatmap[key] ?? 0) + 1;
      d.setDate(d.getDate() + 1);
    }
  }

  res.json(heatmap);
};
