import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { publishToSocial } from '../lib/socialPublish';
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

// --- helpers: JSON string fields are stored serialized; (de)serialize at the edge ---
const parseField = (v: any) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};
const serializeField = (v: any) =>
  v == null ? v : (typeof v === 'string' ? v : JSON.stringify(v));

const hydrateCampaign = (c: any) => ({
  ...c,
  targetAudience: parseField(c.targetAudience),
  goals: parseField(c.goals),
  metrics: parseField(c.metrics),
});
const hydratePost = (p: any) => ({
  ...p,
  hashtags: parseField(p.hashtags) ?? [],
  mediaUrls: parseField(p.mediaUrls) ?? [],
  metrics: parseField(p.metrics),
});

// Campaigns
router.get('/campaigns', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { socialPosts: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(campaigns.map(hydrateCampaign));
});

router.post('/campaigns', async (req, res) => {
  const { name, type, description, status, budget, startDate, endDate, targetAudience, goals } = req.body ?? {};
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  const campaign = await prisma.campaign.create({
    data: {
      name, type,
      description: description || null,
      status: status || 'DRAFT',
      budget: budget != null && budget !== '' ? Number(budget) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience: serializeField(targetAudience),
      goals: serializeField(goals),
    },
  });
  res.status(201).json(hydrateCampaign(campaign));
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
  res.json(posts.map(hydratePost));
});

router.post('/posts', async (req, res) => {
  const { platform, caption, status, scheduledAt, hashtags, mediaUrls, campaignId } = req.body ?? {};
  if (!platform || !caption) return res.status(400).json({ error: 'Platform and caption are required' });
  const post = await prisma.socialPost.create({
    data: {
      platform, caption,
      status: status || 'DRAFT',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      hashtags: serializeField(hashtags ?? []),
      mediaUrls: serializeField(mediaUrls ?? []),
      campaignId: campaignId || null,
    },
  });
  res.status(201).json(hydratePost(post));
});

// Generic update + workflow transition (DRAFT → PENDING_APPROVAL → APPROVED → SCHEDULED → PUBLISHED).
// When status becomes PUBLISHED, attempt to publish to the connected social platform.
const POST_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED'];
router.put('/posts/:id', async (req, res) => {
  const { status, caption, hashtags, mediaUrls, scheduledAt, platform } = req.body ?? {};
  if (status && !POST_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const existing = await prisma.socialPost.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  // If transitioning to PUBLISHED, try to push to the social platform first.
  let externalId = existing.externalId;
  if (status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
    const result = await publishToSocial(platform || existing.platform, {
      caption: caption ?? existing.caption,
      hashtags: (parseField(hashtags ?? existing.hashtags) as string[]) ?? [],
      mediaUrls: (parseField(mediaUrls ?? existing.mediaUrls) as string[]) ?? [],
    });
    if (!result.ok) return res.status(400).json({ error: result.error });
    externalId = result.externalId ?? externalId;
  }

  const post = await prisma.socialPost.update({
    where: { id: req.params.id },
    data: {
      ...(status ? { status } : {}),
      ...(caption !== undefined ? { caption } : {}),
      ...(platform ? { platform } : {}),
      ...(hashtags !== undefined ? { hashtags: serializeField(hashtags) } : {}),
      ...(mediaUrls !== undefined ? { mediaUrls: serializeField(mediaUrls) } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      ...(status === 'PUBLISHED' ? { publishedAt: new Date(), externalId } : {}),
    },
  });
  res.json(hydratePost(post));
});

router.put('/posts/:id/approve', async (req, res) => {
  const post = await prisma.socialPost.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
  });
  res.json(hydratePost(post));
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
        hashtags: serializeField((row.hashtags || row.Hashtags || '').split(',').map((h: string) => h.trim()).filter(Boolean)),
        status: 'PENDING_APPROVAL',
      },
    });
    created.push(post);
  }
  res.json({ message: `${created.length} posts imported`, data: created });
});

// --- Social Accounts (credentials for auto-publishing) ---
const SOCIAL_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'GOOGLE_BUSINESS', 'WHATSAPP'];

// List connection status for every platform. Never returns the access token.
router.get('/social-accounts', async (_req, res) => {
  const accounts = await prisma.socialAccount.findMany();
  const byPlatform = new Map(accounts.map(a => [a.platform, a]));
  res.json(SOCIAL_PLATFORMS.map(platform => {
    const a = byPlatform.get(platform);
    return {
      platform,
      handle: a?.handle ?? null,
      profileUrl: a?.profileUrl ?? null,
      accountId: a?.accountId ?? null,
      connected: a?.connected ?? false,
      hasToken: !!a?.accessToken,
    };
  }));
});

// Upsert credentials for a platform (admin only). accessToken is write-only.
router.put('/social-accounts/:platform', authorize('SUPER_ADMIN', 'MARKETING_ADMIN'), async (req, res) => {
  const platform = req.params.platform.toUpperCase();
  if (!SOCIAL_PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });
  const { handle, profileUrl, accessToken, accountId, connected } = req.body ?? {};

  const data: any = {
    handle: handle ?? null,
    profileUrl: profileUrl ?? null,
    accountId: accountId ?? null,
    connected: connected ?? false,
  };
  // Only overwrite the token when a new non-empty value is provided.
  if (typeof accessToken === 'string' && accessToken.trim()) data.accessToken = accessToken.trim();

  const account = await prisma.socialAccount.upsert({
    where: { platform },
    update: data,
    create: { platform, ...data },
  });
  res.json({
    platform: account.platform, handle: account.handle, profileUrl: account.profileUrl,
    accountId: account.accountId, connected: account.connected, hasToken: !!account.accessToken,
  });
});

export default router;
