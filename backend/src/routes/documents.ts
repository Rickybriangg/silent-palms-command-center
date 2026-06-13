import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import * as xlsx from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from 'docx';

const router = Router();
router.use(authenticate);

router.post('/excel/revenue', async (req, res) => {
  const { period = 'month' } = req.body;
  const revenues = await prisma.revenue.findMany({ orderBy: { date: 'desc' }, take: 200 });
  const rows = revenues.map(r => ({
    Date: r.date.toISOString().slice(0, 10),
    Source: r.source,
    Category: r.category,
    Amount: Number(r.amount),
    Currency: r.currency,
    Description: r.description,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Revenue');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

router.post('/excel/bookings', async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { guest: true, unit: true },
    orderBy: { checkIn: 'desc' },
    take: 500,
  });
  const rows = bookings.map(b => ({
    Reference: b.referenceNumber,
    Guest: `${b.guest.firstName} ${b.guest.lastName}`,
    Unit: b.unit.name,
    Channel: b.channel,
    'Check In': b.checkIn.toISOString().slice(0, 10),
    'Check Out': b.checkOut.toISOString().slice(0, 10),
    Nights: b.nights,
    Adults: b.adults,
    Amount: Number(b.totalAmount),
    Status: b.status,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Bookings');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=bookings-report.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

router.post('/word/report', async (req, res) => {
  const { title, sections } = req.body;
  const children: any[] = [
    new Paragraph({ text: 'Silent Palms Villa', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
    new Paragraph({ text: '' }),
  ];

  for (const section of sections || []) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: section.content }));
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  res.setHeader('Content-Disposition', `attachment; filename=${title.replace(/\s+/g, '-').toLowerCase()}.docx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
});

export default router;
