import { Router, Response } from 'express';
import { getBookings, getBooking, createBooking, updateBooking, getCalendar, getAvailability } from '../controllers/bookingController';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendWhatsApp } from '../lib/whatsappSend';

const router = Router();
router.use(authenticate);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/calendar', getCalendar);
router.get('/availability', getAvailability);

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

  // Mark confirmed and record the message.
  await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } });
  const wa = await sendWhatsApp(booking.guest.whatsapp || booking.guest.phone, msg);
  await prisma.whatsAppMessage.create({
    data: {
      guestId: booking.guestId, direction: 'OUTBOUND', body: msg,
      status: wa.ok ? 'SENT' : (wa.connected ? 'FAILED' : 'PENDING'), messageId: wa.externalId || null,
    },
  });
  res.json({ delivered: wa.ok, note: wa.ok ? 'Confirmation sent via WhatsApp.' : wa.error });
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
