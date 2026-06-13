import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import * as xlsx from 'xlsx';

const router = Router();
router.use(authenticate);

const ALLOWED_IMPORT_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel', 'text/csv', 'application/csv',
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_IMPORT_MIMES.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only Excel/CSV files are allowed')),
});

// Bulk import guest contacts (name, phone, email) for marketing.
// Accepts .xlsx/.xls/.csv with columns: firstName, lastName, phone, email (case-insensitive).
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const workbook = xlsx.read(req.file.buffer);
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];

  const pick = (row: any, ...keys: string[]) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(k.toLowerCase().replace(/[\s_]/g, ''))) return String(row[k]).trim();
    }
    return '';
  };

  let imported = 0, skipped = 0;
  for (const row of rows) {
    const phone = pick(row, 'phone', 'phonenumber', 'mobile', 'tel', 'whatsapp');
    if (!phone) { skipped++; continue; }
    const firstName = pick(row, 'firstname', 'first', 'name') || 'Guest';
    const lastName = pick(row, 'lastname', 'last', 'surname') || '';
    const email = pick(row, 'email', 'emailaddress') || null;
    try {
      await prisma.guest.upsert({
        where: { phone },
        update: { ...(email ? { email } : {}) },
        create: { firstName, lastName, phone, email: email || undefined, source: 'IMPORT', tags: JSON.stringify(['lead', 'imported']) },
      });
      imported++;
    } catch { skipped++; }
  }
  res.json({ message: `${imported} contacts imported${skipped ? `, ${skipped} skipped` : ''}`, imported, skipped });
});

router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query as Record<string, string>;
  const where: any = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: { labels: true, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.guest.count({ where }),
  ]);
  res.json({ data: guests, total });
});

router.get('/:id', async (req, res) => {
  const guest = await prisma.guest.findUnique({
    where: { id: req.params.id },
    include: { bookings: { include: { unit: true }, orderBy: { checkIn: 'desc' } }, labels: true, reviews: true },
  });
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

router.post('/', async (req, res) => {
  const guest = await prisma.guest.create({ data: req.body });
  res.status(201).json(guest);
});

router.put('/:id', async (req, res) => {
  const guest = await prisma.guest.update({ where: { id: req.params.id }, data: req.body });
  res.json(guest);
});

router.post('/:id/labels', async (req, res) => {
  const label = await prisma.guestLabel.create({ data: { guestId: req.params.id, ...req.body } });
  res.status(201).json(label);
});

export default router;
