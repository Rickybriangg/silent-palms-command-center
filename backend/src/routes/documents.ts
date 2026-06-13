import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import * as xlsx from 'xlsx';
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

const router = Router();
router.use(authenticate);

// ---------- helpers ----------
function getRange(period?: string) {
  const now = new Date();
  switch (period) {
    case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now), label: 'This Quarter' };
    case 'year': return { start: startOfYear(now), end: endOfYear(now), label: 'This Year' };
    case 'all': return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1), label: 'All Time' };
    default: return { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month' };
  }
}
const money = (n: number) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const day = (d: Date) => new Date(d).toISOString().slice(0, 10);

// Pull real data from the database for a given report type + date range.
async function gather(type: string, range: { start: Date; end: Date }) {
  const inDate = { gte: range.start, lte: range.end };
  switch (type) {
    case 'revenue': {
      const rows = await prisma.revenue.findMany({ where: { date: inDate }, orderBy: { date: 'desc' } });
      return { rows: rows.map(r => ({ Date: day(r.date), Source: r.source, Category: r.category, Amount: Number(r.amount), Currency: r.currency, Description: r.description ?? '' })), total: rows.reduce((s, r) => s + Number(r.amount), 0) };
    }
    case 'expenses': {
      const rows = await prisma.expense.findMany({ where: { date: inDate }, orderBy: { date: 'desc' } });
      return { rows: rows.map(e => ({ Date: day(e.date), Category: e.category, Vendor: e.vendor ?? '', Amount: Number(e.amount), Currency: e.currency, Description: e.description ?? '' })), total: rows.reduce((s, e) => s + Number(e.amount), 0) };
    }
    case 'bookings': {
      const rows = await prisma.booking.findMany({ where: { checkIn: inDate }, include: { guest: true, unit: true }, orderBy: { checkIn: 'desc' } });
      return { rows: rows.map(b => ({ Reference: b.referenceNumber, Guest: `${b.guest.firstName} ${b.guest.lastName}`, Unit: b.unit?.name ?? '', Channel: b.channel, CheckIn: day(b.checkIn), CheckOut: day(b.checkOut), Nights: b.nights, Amount: Number(b.totalAmount), Status: b.status })), total: rows.reduce((s, b) => s + Number(b.totalAmount), 0) };
    }
    case 'guests': {
      const rows = await prisma.guest.findMany({ orderBy: { createdAt: 'desc' } });
      return { rows: rows.map(g => ({ Name: `${g.firstName} ${g.lastName}`, Phone: g.phone, Email: g.email ?? '', Nationality: g.nationality ?? '', Bookings: g.totalBookings, VIP: g.isVip ? 'Yes' : 'No', Source: g.source ?? '' })), total: rows.length };
    }
    default:
      return { rows: [] as any[], total: 0 };
  }
}

async function gatherKpis(range: { start: Date; end: Date }) {
  const inDate = { gte: range.start, lte: range.end };
  const [rev, exp, bookings, guests, units, campaigns] = await Promise.all([
    prisma.revenue.aggregate({ where: { date: inDate }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: inDate }, _sum: { amount: true } }),
    prisma.booking.findMany({ where: { checkIn: inDate, status: { not: 'CANCELLED' } }, select: { totalAmount: true, nights: true } }),
    prisma.guest.count(),
    prisma.unit.count({ where: { isActive: true } }),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
  ]);
  const revenue = Number(rev._sum.amount ?? 0);
  const expenses = Number(exp._sum.amount ?? 0);
  const nights = bookings.reduce((s, b) => s + b.nights, 0);
  const days = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000));
  const occupancy = units > 0 ? Math.min(100, (nights / (units * days)) * 100) : 0;
  const adr = bookings.length ? bookings.reduce((s, b) => s + Number(b.totalAmount), 0) / bookings.length : 0;
  return { revenue, expenses, profit: revenue - expenses, bookings: bookings.length, guests, occupancy, adr, activeCampaigns: campaigns };
}

async function gatherFinancial(range: { start: Date; end: Date }) {
  const inDate = { gte: range.start, lte: range.end };
  const [revenue, expenses] = await Promise.all([
    prisma.revenue.findMany({ where: { date: inDate } }),
    prisma.expense.findMany({ where: { date: inDate } }),
  ]);
  const group = (rows: any[], key: string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r[key] || 'Other', (m.get(r[key] || 'Other') ?? 0) + Number(r.amount));
    return [...m.entries()].map(([k, v]) => ({ name: k, amount: v })).sort((a, b) => b.amount - a.amount);
  };
  const totalIn = revenue.reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = expenses.reduce((s, e) => s + Number(e.amount), 0);
  return { inflow: group(revenue, 'category'), outflow: group(expenses, 'category'), totalIn, totalOut, net: totalIn - totalOut };
}

const TITLES: Record<string, string> = {
  revenue: 'Revenue Report', expenses: 'Expenses Report', bookings: 'Bookings Report',
  guests: 'Guest / CRM List', executive: 'Executive Report', occupancy: 'Occupancy Report', financial: 'Financial Statement',
};

// ---------- unified generator: POST /documents/generate { type, format, period } ----------
router.post('/generate', async (req: AuthRequest, res: Response) => {
  const { type = 'revenue', format = 'excel', period = 'month' } = req.body ?? {};
  const range = getRange(period);
  const title = TITLES[type] ?? 'Report';
  const fname = `${type}-${period}`;

  if ((type === 'financial' || type === 'expenses') && !['SUPER_ADMIN', 'FINANCE_MANAGER'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Financial reports are restricted to Finance Managers and Admins' });
  }

  // ----- EXCEL -----
  if (format === 'excel') {
    const wb = xlsx.utils.book_new();
    if (type === 'financial') {
      const f = await gatherFinancial(range);
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(f.inflow.length ? f.inflow.map(i => ({ Category: i.name, Inflow: i.amount })) : [{ Note: 'No income' }]), 'Inflow');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(f.outflow.length ? f.outflow.map(o => ({ Category: o.name, Outflow: o.amount })) : [{ Note: 'No expenses' }]), 'Outflow');
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet([{ TotalInflow: f.totalIn, TotalOutflow: f.totalOut, Net: f.net }]), 'Summary');
    } else if (type === 'executive' || type === 'occupancy') {
      const k = await gatherKpis(range);
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet([k]), 'KPIs');
    } else {
      const { rows } = await gather(type, range);
      const sheetName = title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 28);
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No data for this period' }]), sheetName);
    }
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=${fname}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  }

  // ----- PDF -----
  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', `attachment; filename=${fname}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buffer);
    });

    doc.fillColor('#0f766e').fontSize(22).text('Silent Palms Villa');
    doc.fillColor('#6b7280').fontSize(10).text('Diani Beach, Kenya');
    doc.moveDown(0.5);
    doc.fillColor('#0f766e').fontSize(16).text(title);
    doc.fillColor('#6b7280').fontSize(10).text(`Period: ${range.label}    Generated: ${new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown();
    doc.strokeColor('#0f766e').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    const line = (label: string, value: string) => {
      const y = doc.y;
      doc.fillColor('#1f2937').fontSize(11).text(label, 60, y, { width: 300 });
      doc.fillColor('#0f766e').fontSize(11).text(value, 350, y, { width: 195, align: 'right' });
      doc.moveDown(0.2);
    };

    if (type === 'executive' || type === 'occupancy') {
      const k = await gatherKpis(range);
      doc.fillColor('#0f766e').fontSize(13).text('Key Performance Indicators'); doc.moveDown(0.5);
      line('Total Revenue', money(k.revenue));
      line('Total Expenses', money(k.expenses));
      line('Net Profit', money(k.profit));
      line('Bookings', String(k.bookings));
      line('Occupancy Rate', `${k.occupancy.toFixed(1)}%`);
      line('ADR (Avg Daily Rate)', money(k.adr));
      line('Total Guests', String(k.guests));
      line('Active Campaigns', String(k.activeCampaigns));
    } else if (type === 'financial') {
      const f = await gatherFinancial(range);
      doc.fillColor('#047857').fontSize(13).text('Inflow (Money In)'); doc.moveDown(0.3);
      f.inflow.forEach(i => line(i.name, money(i.amount)));
      doc.moveDown(0.5); doc.fillColor('#b91c1c').fontSize(13).text('Outflow (Money Out)'); doc.moveDown(0.3);
      f.outflow.forEach(o => line(o.name, money(o.amount)));
      doc.moveDown(0.5); doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke(); doc.moveDown(0.5);
      line('Total Inflow', money(f.totalIn)); line('Total Outflow', money(f.totalOut));
      doc.fillColor('#0f766e').fontSize(13); line('NET POSITION', money(f.net));
    } else {
      const { rows, total } = await gather(type, range);
      const headers = rows.length ? Object.keys(rows[0]) : [];
      doc.fillColor('#0f766e').fontSize(9).text(headers.join('   |   ')); doc.moveDown(0.3);
      doc.fillColor('#1f2937').fontSize(9);
      rows.slice(0, 45).forEach(r => doc.text(Object.values(r).map(v => String(v)).join('   |   ')));
      if (!rows.length) doc.fillColor('#6b7280').text('No data for this period.');
      doc.moveDown();
      if (type === 'revenue' || type === 'expenses' || type === 'bookings') doc.fillColor('#0f766e').fontSize(12).text(`Total: ${money(total)}`);
    }
    doc.moveDown(2); doc.fillColor('#9ca3af').fontSize(9).text('Confidential — Silent Palms Villa. Computer-generated report.', { align: 'center' });
    doc.end();
    return;
  }

  // ----- WORD -----
  const children: any[] = [
    new Paragraph({ text: 'Silent Palms Villa', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Period: ${range.label}  •  Generated: ${new Date().toLocaleDateString('en-GB')}` }),
    new Paragraph({ text: '' }),
  ];
  if (type === 'executive' || type === 'occupancy') {
    const k = await gatherKpis(range);
    children.push(new Paragraph({ text: 'Key Performance Indicators', heading: HeadingLevel.HEADING_2 }));
    const rows = [
      ['Total Revenue', money(k.revenue)], ['Total Expenses', money(k.expenses)], ['Net Profit', money(k.profit)],
      ['Bookings', String(k.bookings)], ['Occupancy Rate', `${k.occupancy.toFixed(1)}%`], ['ADR', money(k.adr)],
      ['Total Guests', String(k.guests)], ['Active Campaigns', String(k.activeCampaigns)],
    ];
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([a, b]) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a, bold: true })] })] }),
        new TableCell({ children: [new Paragraph(b)] }),
      ] })),
    }));
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ text: `During ${range.label.toLowerCase()}, Silent Palms Villa generated ${money(k.revenue)} in revenue against ${money(k.expenses)} in expenses, for a net profit of ${money(k.profit)}. Occupancy stood at ${k.occupancy.toFixed(1)}% across ${k.bookings} booking(s).` }));
  } else {
    const { rows, total } = await gather(type, range);
    children.push(new Paragraph({ text: `${rows.length} record(s)`, heading: HeadingLevel.HEADING_2 }));
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) }),
          ...rows.slice(0, 80).map(r => new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph(String((r as any)[h]))] })) })),
        ],
      }));
      if (type === 'revenue' || type === 'expenses' || type === 'bookings') children.push(new Paragraph({ text: `Total: ${money(total)}`, heading: HeadingLevel.HEADING_2 }));
    } else {
      children.push(new Paragraph({ text: 'No data for this period.' }));
    }
  }
  const docx = new DocxDocument({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(docx);
  res.setHeader('Content-Disposition', `attachment; filename=${fname}.docx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
});

// ---------- backward-compatible endpoints (used by the Revenue page) ----------
async function sendExcel(res: Response, type: string, period: string, fname: string) {
  const range = getRange(period);
  const { rows } = await gather(type, range);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No data' }]), type.slice(0, 28));
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename=${fname}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}
router.post('/excel/revenue', async (req, res) => sendExcel(res, 'revenue', req.body?.period ?? 'all', 'revenue-report'));
router.post('/excel/bookings', async (req, res) => sendExcel(res, 'bookings', req.body?.period ?? 'all', 'bookings-report'));

// ---------- Document Library (upload / list / download / delete) ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

router.get('/library', async (_req, res) => {
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, format: true, size: true, metadata: true, createdAt: true } });
  res.json(docs);
});

router.post('/library', upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category } = req.body ?? {};
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const doc = await prisma.document.create({
    data: {
      name: req.file.originalname,
      type: category || 'GENERAL',
      format: req.file.mimetype.split('/').pop() || 'file',
      url: dataUrl,
      size: req.file.size,
      metadata: JSON.stringify({ uploadedBy: req.user?.email }),
    },
    select: { id: true, name: true, type: true, format: true, size: true, createdAt: true },
  });
  res.status(201).json(doc);
});

router.get('/library/:id/download', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc || !doc.url.startsWith('data:')) return res.status(404).json({ error: 'Not found' });
  const [meta, b64] = doc.url.split(',');
  const mime = meta.slice(5).split(';')[0];
  res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
  res.setHeader('Content-Type', mime);
  res.send(Buffer.from(b64, 'base64'));
});

router.delete('/library/:id', authorize('SUPER_ADMIN', 'FINANCE_MANAGER', 'PROPERTY_MANAGER'), async (req, res) => {
  await prisma.document.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
