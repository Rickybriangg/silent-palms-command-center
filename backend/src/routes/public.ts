import { Router } from 'express';
import cors from 'cors';
import { prisma } from '../lib/prisma';

// Public, unauthenticated endpoints for the marketing website to push
// inquiries/leads into the CRM. CORS is open here (it's a public form).
const router = Router();
router.use(cors({ origin: true }));

// POST /api/v1/public/inquiry  — capture a website booking inquiry as a guest lead.
router.post('/inquiry', async (req, res) => {
  const { name, firstName, lastName, email, phone, message, checkIn, checkOut, source } = req.body ?? {};
  const fName = firstName || (name ? String(name).split(' ')[0] : '') || 'Website';
  const lName = lastName || (name ? String(name).split(' ').slice(1).join(' ') : '') || 'Lead';
  if (!phone && !email) return res.status(400).json({ error: 'A phone number or email is required' });

  const key = phone ? { phone: String(phone) } : { email: String(email) };
  const tags = JSON.stringify(['lead', 'website', ...(checkIn ? ['enquiry'] : [])]);
  const noteParts = [message, checkIn && `Requested: ${checkIn}${checkOut ? ` → ${checkOut}` : ''}`].filter(Boolean);

  try {
    const guest = await prisma.guest.upsert({
      where: key as any,
      update: { notes: noteParts.join(' | ') || undefined, ...(email ? { email: String(email) } : {}) },
      create: {
        firstName: fName, lastName: lName,
        phone: phone ? String(phone) : `WEB-${Date.now()}`,
        email: email ? String(email) : undefined,
        source: source || 'WEBSITE',
        tags,
        notes: noteParts.join(' | ') || undefined,
      },
    });
    res.status(201).json({ success: true, message: 'Inquiry received. Our team will be in touch shortly.', guestId: guest.id });
  } catch {
    res.status(201).json({ success: true, message: 'Inquiry received.' });
  }
});

export default router;
