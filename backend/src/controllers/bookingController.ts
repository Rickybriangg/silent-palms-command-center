import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getBookings = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, channel, search, startDate, endDate } = req.query as Record<string, string>;

  const where: any = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (startDate) where.checkIn = { gte: new Date(startDate) };
  if (endDate) where.checkOut = { lte: new Date(endDate) };
  if (search) {
    where.OR = [
      { guest: { firstName: { contains: search, mode: 'insensitive' } } },
      { guest: { lastName: { contains: search, mode: 'insensitive' } } },
      { guest: { email: { contains: search, mode: 'insensitive' } } },
      { referenceNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { guest: true, unit: true, property: true },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ data: bookings, total, page: Number(page), limit: Number(limit) });
};

export const getBooking = async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { guest: true, unit: true, property: true, revenue: true, review: true },
  });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const nights = Math.ceil(
    (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  const booking = await prisma.booking.create({
    data: { ...data, nights, checkIn: new Date(data.checkIn), checkOut: new Date(data.checkOut) },
    include: { guest: true, unit: true },
  });

  // Update guest booking count
  await prisma.guest.update({
    where: { id: booking.guestId },
    data: { totalBookings: { increment: 1 } },
  });

  res.status(201).json(booking);
};

export const updateBooking = async (req: Request, res: Response) => {
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: req.body,
    include: { guest: true, unit: true },
  });
  res.json(booking);
};

export const getCalendar = async (req: Request, res: Response) => {
  const { month, year } = req.query as { month: string; year: string };
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { checkIn: { gte: start, lte: end } },
        { checkOut: { gte: start, lte: end } },
        { checkIn: { lte: start }, checkOut: { gte: end } },
      ],
      status: { not: 'CANCELLED' },
    },
    include: { guest: { select: { firstName: true, lastName: true } }, unit: true },
  });

  res.json(bookings);
};

export const getAvailability = async (req: Request, res: Response) => {
  const { checkIn, checkOut, unitId } = req.query as Record<string, string>;

  const conflicting = await prisma.booking.count({
    where: {
      unitId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      OR: [
        { checkIn: { lt: new Date(checkOut), gte: new Date(checkIn) } },
        { checkOut: { gt: new Date(checkIn), lte: new Date(checkOut) } },
        { checkIn: { lte: new Date(checkIn) }, checkOut: { gte: new Date(checkOut) } },
      ],
    },
  });

  res.json({ available: conflicting === 0 });
};
