import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import * as xlsx from 'xlsx';

const router = Router();
// Cap upload size (5MB) and restrict to spreadsheet types to prevent
// memory-exhaustion and arbitrary-file uploads.
const ALLOWED_UPLOAD_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/csv',
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_UPLOAD_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only Excel/CSV files are allowed'));
  },
});
router.use(authenticate);

// Campaigns
router.get('/campaigns', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { socialPosts: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(campaigns);
});

router.post('/campaigns', async (req, res) => {
  const campaign = await prisma.campaign.create({ data: req.body });
  res.status(201).json(campaign);
});

router.put('/campaigns/:id', async (req, res) => {
  const campaign = await prisma.campaign.update({ where: { id: req.params.id }, data: req.body });
  res.json(campaign);
});

// Content Calendar
router.get('/calendar', async (req, res) => {
  const { month, year } = req.query as { month: string; year: string };
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0);
  const posts = await prisma.contentCalendar.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(posts);
});

router.post('/calendar', async (req, res) => {
  const post = await prisma.contentCalendar.create({ data: req.body });
  res.status(201).json(post);
});

router.put('/calendar/:id', async (req, res) => {
  const post = await prisma.contentCalendar.update({ where: { id: req.params.id }, data: req.body });
  res.json(post);
});

// Social Posts
router.get('/posts', async (req, res) => {
  const { platform, status } = req.query as Record<string, string>;
  const where: any = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;
  const posts = await prisma.socialPost.findMany({ where, orderBy: { scheduledAt: 'desc' } });
  res.json(posts);
});

router.post('/posts', async (req, res) => {
  const post = await prisma.socialPost.create({ data: req.body });
  res.status(201).json(post);
});

router.put('/posts/:id/approve', async (req, res) => {
  const post = await prisma.socialPost.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
  });
  res.json(post);
});

// Bulk upload from Excel
router.post('/upload-batch', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const workbook = xlsx.read(req.file.buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet) as any[];

  const created: any[] = [];
  for (const row of rows) {
    const post = await prisma.contentCalendar.create({
      data: {
        title: row.title || row.Title,
        caption: row.caption || row.Caption,
        platform: (row.platform || row.Platform || 'INSTAGRAM').toUpperCase(),
        contentType: (row.type || row.Type || 'POST').toUpperCase(),
        scheduledAt: row.scheduledAt || row['Scheduled At'] ? new Date(row.scheduledAt || row['Scheduled At']) : null,
        hashtags: (row.hashtags || row.Hashtags || '').split(',').map((h: string) => h.trim()).filter(Boolean),
        status: 'PENDING_APPROVAL',
      },
    });
    created.push(post);
  }
  res.json({ message: `${created.length} posts imported`, data: created });
});

export default router;
