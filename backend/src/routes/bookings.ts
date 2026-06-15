import { Router, Response } from 'express';
import { getBookings, getBooking, createBooking, updateBooking, getCalendar, getAvailability } from '../controllers/bookingController';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsApp } from '../lib/whatsappSend';
import { sendEmail, templates } from '../lib/email';

const router = Router();
router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/calendar', getCalendar);
router.get('/availability', getAvailability);

// Bookings awaiting management approval (from the website high-value/group routing).
router.get('/awaiting-approval', async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.booking.findMany({ where: { status: 'AWAITING_APPROVAL' }, include: { guest: true, unit: true }, orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

// Approve or reject a booking that is awaiting approval (manager/admin).
router.post('/:id/approve', authorize('SUPER_ADMIN', 'PROPERTY_MANAGER', 'FINANCE_MANAGER'), async (req: AuthRequest, res: Response) => {
  const { decision } = req.body ?? {};
  const status = decision === 'REJECT' ? 'CANCELLED' : 'CONFIRMED';
  const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status }, include: { guest: true } });
  res.json({ id: booking.id, status });
});

// Send a booking confirmation to the guest via WhatsApp.
router.post('/:id/confirm', async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { guest: true, unit: true } });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const msg = [
    `Hi ${booking.guest.firstName}, your booking at Silent Palms Villa is confirmed! 🌴`,
    ``,
    `📋 Ref: ${booking.referenceNumber}`,
    `🏡 Unit: ${booking.unit?.name ?? ''}`,
    `📅 Check-in: ${new Date(booking.checkIn).toDateString()}`,
    `📅 Check-out: ${new Date(booking.checkOut).toDateString()}`,
    `🌙 Nights: ${booking.nights}`,
    `💵 Total: ${booking.currency} ${booking.totalAmount.toLocaleString()}`,
    ``,
    `We look forward to welcoming you to Diani Beach!`,
  ].join('\n');

  // Mark confirmed and record/send across channels.
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } });
  const wa = await sendWhatsApp(booking.guest.whatsapp || booking.guest.phone, msg);
  await prisma.whatsAppMessage.create({
    data: {
      guestId: booking.guestId, direction: 'OUTBOUND', body: msg,
      status: wa.ok ? 'SENT' : (wa.connected ? 'FAILED' : 'PENDING'), messageId: wa.externalId || null,
    },
  });
  // Also email the guest a branded confirmation, if they have an email.
  const em = booking.guest.email
    ? await sendEmail(booking.guest.email, `Booking confirmed — ${booking.referenceNumber}`, templates.bookingConfirmation(booking.guest, booking))
    : { ok: false, error: 'No email on file' };

  const channels = [wa.ok && 'WhatsApp', em.ok && 'email'].filter(Boolean);
  res.json({
    delivered: wa.ok || em.ok,
    whatsapp: wa.ok, email: em.ok,
    note: channels.length ? `Confirmation sent via ${channels.join(' + ')}.` : (wa.error || em.error),
  });
});

// Send a review request (Google Business link) via email + WhatsApp.
router.post('/:id/review-request', async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { guest: true } });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const gb = await prisma.socialAccount.findUnique({ where: { platform: 'GOOGLE_BUSINESS' } });
  const reviewUrl = gb?.profileUrl
    || (gb?.accountId ? `https://search.google.com/local/writereview?placeid=${gb.accountId}` : null);
  if (!reviewUrl) return res.status(400).json({ error: 'Add your Google review link (or Place ID) in Settings → Email & Reviews first.' });

  const waMsg = `Hi ${booking.guest.firstName}, thank you for staying at Silent Palms Villa! 🌴 We'd love your feedback — please leave us a quick Google review: ${reviewUrl}`;
  const wa = await sendWhatsApp(booking.guest.whatsapp || booking.guest.phone, waMsg);
  await prisma.whatsAppMessage.create({ data: { guestId: booking.guestId, direction: 'OUTBOUND', body: waMsg, status: wa.ok ? 'SENT' : (wa.connected ? 'FAILED' : 'PENDING') } }).catch(() => {});
  const em = booking.guest.email
    ? await sendEmail(booking.guest.email, 'How was your stay at Silent Palms? ⭐', templates.reviewRequest(booking.guest, reviewUrl))
    : { ok: false, error: 'No email on file' };

  const channels = [wa.ok && 'WhatsApp', em.ok && 'email'].filter(Boolean);
  res.json({ delivered: wa.ok || em.ok, reviewUrl, note: channels.length ? `Review request sent via ${channels.join(' + ')}.` : (wa.error || em.error) });
});

// Sync reservations from connected channel iCal feeds (Airbnb, Booking.com, etc.).
router.post('/sync-ical', async (_req: AuthRequest, res: Response) => {
  const channels = await prisma.socialAccount.findMany({
    where: { platform: { in: ['CHANNEL_AIRBNB', 'CHANNEL_BOOKING', 'CHANNEL_EXPEDIA', 'CHANNEL_VRBO'] }, connected: true },
  });
  if (channels.length === 0) return res.status(400).json({ error: 'No booking channels connected. Add iCal URLs in Settings → Booking Channels.' });

  // Ensure a placeholder guest exists for externally-synced reservations.
  const channelGuest = await prisma.guest.upsert({
    where: { phone: 'CHANNEL-IMPORT' },
    update: {},
    create: { firstName: 'Channel', lastName: 'Reservation', phone: 'CHANNEL-IMPORT', source: 'CHANNEL', tags: '[]' },
  });

  let imported = 0;
  const errors: string[] = [];
  for (const ch of channels) {
    if (!ch.profileUrl) continue;
    try {
      const r = await fetch(ch.profileUrl);
      const text = await r.text();
      const events = parseIcal(text);
      const channelName = ch.platform.replace('CHANNEL_', '');
      for (const ev of events) {
        if (!ev.start || !ev.end) continue;
        const ref = `ICAL-${channelName}-${ev.uid || ev.start}`;
        const nights = Math.max(1, Math.ceil((ev.end.getTime() - ev.start.getTime()) / 86400000));
        await prisma.booking.upsert({
          where: { referenceNumber: ref },
          update: { checkIn: ev.start, checkOut: ev.end, nights },
          create: {
            referenceNumber: ref, guestId: channelGuest.id, unitId: 'whole-villa', propertyId: 'silent-palms-villa',
            channel: channelName === 'BOOKING' ? 'BOOKING_COM' : channelName, status: 'CONFIRMED',
            checkIn: ev.start, checkOut: ev.end, nights, adults: 1, baseAmount: 0, totalAmount: 0,
            notes: ev.summary || 'Imported from channel calendar',
          },
        });
        imported++;
      }
    } catch (e: any) {
      errors.push(`${ch.platform}: ${e?.message ?? 'fetch failed'}`);
    }
  }
  res.json({ message: `${imported} reservations synced from ${channels.length} channel(s)`, imported, errors });
});

router.get('/:id', getBooking);
router.put('/:id', updateBooking);

// Minimal iCal VEVENT parser (handles Airbnb/Booking.com export feeds).
function parseIcal(text: string) {
  const events: { uid?: string; summary?: string; start?: Date; end?: Date }[] = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  const toDate = (v: string) => {
    const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
    if (!m) return undefined;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  };
  for (const b of blocks) {
    const body = b.split('END:VEVENT')[0];
    const get = (key: string) => {
      const line = body.split(/\r?\n/).find(l => l.startsWith(key));
      return line ? line.substring(line.indexOf(':') + 1).trim() : '';
    };
    events.push({ uid: get('UID'), summary: get('SUMMARY'), start: toDate(get('DTSTART')), end: toDate(get('DTEND')) });
  }
  return events;
}

export default router;
