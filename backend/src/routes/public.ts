import { Router } from 'express';
import cors from 'cors';
import { prisma } from '../lib/prisma';

// Public, unauthenticated endpoints for the SilentPalms.com website to push
// inquiries and bookings into the CRM, and to read availability. CORS is open
// (these back the public website widgets).
const router = Router();
router.use(cors({ origin: true }));

const ref = () => 'SP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

// Overlap check helper (shared by availability + booking creation).
async function isAvailable(unitId: string, checkIn: Date, checkOut: Date) {
  const conflicting = await prisma.booking.count({
    where: {
      unitId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      OR: [
        { checkIn: { lt: checkOut, gte: checkIn } },
        { checkOut: { gt: checkIn, lte: checkOut } },
        { checkIn: { lte: checkIn }, checkOut: { gte: checkOut } },
      ],
    },
  });
  return conflicting === 0;
}

// GET /public/units — units the website widget can offer.
router.get('/units', async (_req, res) => {
  const units = await prisma.unit.findMany({ where: { isActive: true }, orderBy: { basePrice: 'asc' }, select: { id: true, name: true, maxGuests: true, bedrooms: true, bathrooms: true, basePrice: true } });
  res.json(units);
});

// GET /public/availability?unitId=&checkIn=&checkOut=
router.get('/availability', async (req, res) => {
  const { unitId, checkIn, checkOut } = req.query as Record<string, string>;
  if (!unitId || !checkIn || !checkOut) return res.status(400).json({ error: 'unitId, checkIn and checkOut are required' });
  res.json({ available: await isAvailable(unitId, new Date(checkIn), new Date(checkOut)) });
});

// POST /public/inquiry — capture a website inquiry as a guest lead.
router.post('/inquiry', async (req, res) => {
  const { name, firstName, lastName, email, phone, message, checkIn, checkOut, source } = req.body ?? {};
  const fName = firstName || (name ? String(name).split(' ')[0] : '') || 'Website';
  const lName = lastName || (name ? String(name).split(' ').slice(1).join(' ') : '') || 'Lead';
  if (!phone && !email) return res.status(400).json({ error: 'A phone number or email is required' });

  const key = phone ? { phone: String(phone) } : { email: String(email) };
  const tags = JSON.stringify(['lead', 'website', ...(checkIn ? ['enquiry'] : [])]);
  const noteParts = [message, checkIn && `Requested: ${checkIn}${checkOut ? ` -> ${checkOut}` : ''}`].filter(Boolean);

  try {
    const guest = await prisma.guest.upsert({
      where: key as any,
      update: { notes: noteParts.join(' | ') || undefined, ...(email ? { email: String(email) } : {}) },
      create: {
        firstName: fName, lastName: lName,
        phone: phone ? String(phone) : `WEB-${Date.now()}`,
        email: email ? String(email) : undefined,
        source: source || 'WEBSITE', tags, notes: noteParts.join(' | ') || undefined,
      },
    });
    const staff = await prisma.user.findMany({ where: { role: { name: { in: ['SUPER_ADMIN', 'GUEST_RELATIONS'] } }, isActive: true }, select: { id: true } });
    await prisma.notification.createMany({ data: staff.map(s => ({ userId: s.id, title: 'New website inquiry', body: `${fName} ${lName} (${phone || email})`, type: 'INQUIRY' })) }).catch(() => {});
    res.status(201).json({ success: true, message: 'Inquiry received. Our team will be in touch shortly.', guestId: guest.id });
  } catch {
    res.status(201).json({ success: true, message: 'Inquiry received.' });
  }
});

// POST /public/booking — create a booking from the website.
// Prevents double-bookings and routes high-value/group/long stays to approval.
router.post('/booking', async (req, res) => {
  const { unitId, checkIn, checkOut, firstName, lastName, email, phone, adults, children, message } = req.body ?? {};
  if (!unitId || !checkIn || !checkOut || (!phone && !email)) {
    return res.status(400).json({ error: 'unitId, checkIn, checkOut and a phone or email are required' });
  }
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return res.status(400).json({ error: 'Unknown unit' });

  const ci = new Date(checkIn), co = new Date(checkOut);
  if (!(co > ci)) return res.status(400).json({ error: 'Check-out must be after check-in' });
  if (!(await isAvailable(unitId, ci, co))) return res.status(409).json({ error: 'Those dates are not available for this unit.' });

  const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
  const baseAmount = unit.basePrice * nights;
  const taxAmount = Math.round(baseAmount * 0.16);
  const totalAmount = baseAmount + taxAmount;
  const pax = Number(adults ?? 1);

  // Approval routing: high-value, large group, or long stay needs approval.
  const needsApproval = totalAmount >= 2000 || pax >= 10 || nights >= 14;
  const status = needsApproval ? 'AWAITING_APPROVAL' : 'PENDING';

  const gkey = phone ? { phone: String(phone) } : { email: String(email) };
  const guest = await prisma.guest.upsert({
    where: gkey as any,
    update: { ...(email ? { email: String(email) } : {}) },
    create: {
      firstName: firstName || 'Website', lastName: lastName || 'Guest',
      phone: phone ? String(phone) : `WEB-${Date.now()}`,
      email: email ? String(email) : undefined, source: 'WEBSITE', tags: JSON.stringify(['website']),
    },
  });

  const booking = await prisma.booking.create({
    data: {
      referenceNumber: ref(), guestId: guest.id, unitId, propertyId: unit.propertyId,
      channel: 'WEBSITE', status, checkIn: ci, checkOut: co, nights,
      adults: pax, children: Number(children ?? 0),
      baseAmount, taxAmount, totalAmount, currency: 'KES',
      notes: message || null,
    },
  });
  await prisma.guest.update({ where: { id: guest.id }, data: { totalBookings: { increment: 1 } } });

  const managers = await prisma.user.findMany({ where: { role: { name: { in: ['SUPER_ADMIN', 'PROPERTY_MANAGER'] } }, isActive: true }, select: { id: true } });
  await prisma.notification.createMany({
    data: managers.map(m => ({ userId: m.id, title: needsApproval ? 'Booking awaiting approval' : 'New website booking', body: `${unit.name} - ${nights} nights - $${totalAmount.toLocaleString()} (${booking.referenceNumber})`, type: 'BOOKING', data: JSON.stringify({ bookingId: booking.id }) })),
  }).catch(() => {});

  res.status(201).json({
    success: true,
    reference: booking.referenceNumber,
    status,
    message: needsApproval ? 'Booking received and is awaiting confirmation from our team.' : 'Booking received! Our team will confirm shortly.',
    summary: { unit: unit.name, nights, total: totalAmount, currency: 'USD' },
  });
});

// GET /public/calendar.ics — iCal feed of all active bookings, so external
// platforms (Google/Airbnb/Booking.com) can subscribe (two-way calendar).
router.get('/calendar.ics', async (_req, res) => {
  const bookings = await prisma.booking.findMany({ where: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } }, include: { unit: true }, take: 1000 });
  const fmt = (d: Date) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Silent Palms//Command Center//EN', 'CALSCALE:GREGORIAN'];
  for (const b of bookings) {
    lines.push('BEGIN:VEVENT', `UID:${b.id}@silentpalms`, `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(b.checkIn)}`, `DTEND:${fmt(b.checkOut)}`,
      `SUMMARY:${b.unit?.name ?? 'Booking'} - ${b.status}`, `STATUS:${b.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="silent-palms.ics"');
  res.send(lines.join('\r\n'));
});

export default router;
