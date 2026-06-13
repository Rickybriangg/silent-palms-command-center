'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, Search, Filter, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';

const UNITS = [
  { id: 'whole-villa', name: 'Whole Villa', basePrice: 500 },
  { id: 'two-bedroom', name: '2-Bedroom Unit', basePrice: 280 },
];
const CHANNELS = ['DIRECT', 'AIRBNB', 'BOOKING_COM', 'EXPEDIA', 'WHATSAPP'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  ARRIVING: 'bg-purple-100 text-purple-700',
  CHECKED_IN: 'bg-emerald-100 text-emerald-700',
  CHECKED_OUT: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
};

const CHANNEL_ICONS: Record<string, string> = {
  DIRECT: '🏡',
  AIRBNB: '🏠',
  BOOKING_COM: '🔵',
  EXPEDIA: '✈️',
  WHATSAPP: '💬',
};

export default function BookingsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', search, status, channel],
    queryFn: () => api.get(`/bookings?search=${search}&status=${status}&channel=${channel}`).then(r => r.data),
  });

  const createBooking = useMutation({
    mutationFn: (payload: any) => api.post('/bookings', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Booking created'); setShowNew(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create booking'),
  });

  const bookings = data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header title="Booking Management" subtitle="Reservations across all channels" />

      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search bookings..." className="pl-9 w-64 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status || 'ALL'} onValueChange={v => setStatus(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={channel || 'ALL'} onValueChange={v => setChannel(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Channels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Channels</SelectItem>
                {Object.keys(CHANNEL_ICONS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['list', 'calendar'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors', view === v ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowNew(true)}>
              <Plus size={14} /> New Booking
            </Button>
          </div>
        </div>

        {view === 'calendar' ? (
          <BookingCalendar />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Reference', 'Guest', 'Unit', 'Channel', 'Check In', 'Check Out', 'Nights', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{(b.referenceNumber ?? b.id ?? '').slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{b.guest?.firstName} {b.guest?.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.unit?.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <span>{CHANNEL_ICONS[b.channel] ?? '📋'}</span>
                        <span className="text-xs">{b.channel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(b.checkIn).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">{b.nights}</td>
                    <td className="px-4 py-3 font-semibold">${Number(b.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[b.status] ?? 'bg-gray-100')}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewing(b)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && bookings.length === 0 && (
              <div className="py-16 text-center text-muted-foreground text-sm">No bookings found</div>
            )}
          </div>
        )}
      </div>

      {showNew && <NewBookingModal onClose={() => setShowNew(false)} onSubmit={(d) => createBooking.mutate(d)} loading={createBooking.isPending} />}
      {viewing && <ViewBookingModal booking={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function NewBookingModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const { data: guests = [] } = useQuery({ queryKey: ['guests-for-booking'], queryFn: () => api.get('/guests').then(r => r.data?.data ?? r.data) });
  const [form, setForm] = useState({ guestId: '', unitId: 'whole-villa', channel: 'DIRECT', status: 'CONFIRMED', checkIn: '', checkOut: '', adults: '2', baseAmount: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const guestList = Array.isArray(guests) ? guests : [];

  return (
    <ModalShell title="New Booking" onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (!form.guestId) return toast.error('Select a guest');
        if (!form.checkIn || !form.checkOut) return toast.error('Select check-in and check-out dates');
        const base = Number(form.baseAmount || 0);
        onSubmit({ ...form, adults: Number(form.adults), baseAmount: base, taxAmount: Math.round(base * 0.16), totalAmount: base + Math.round(base * 0.16) });
      }} className="space-y-3">
        <div>
          <Label>Guest</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.guestId} onChange={e => set('guestId', e.target.value)} required>
            <option value="">Select a guest…</option>
            {guestList.map((g: any) => <option key={g.id} value={g.id}>{g.firstName} {g.lastName} — {g.phone}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unit</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.unitId} onChange={e => { set('unitId', e.target.value); const u = UNITS.find(x => x.id === e.target.value); if (u && !form.baseAmount) set('baseAmount', String(u.basePrice)); }}>
              {UNITS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Channel</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.channel} onChange={e => set('channel', e.target.value)}>
              {CHANNELS.map(c => <option key={c} value={c}>{c.replace('_', '.')}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Check-in</Label><Input type="date" value={form.checkIn} onChange={e => set('checkIn', e.target.value)} required /></div>
          <div><Label>Check-out</Label><Input type="date" value={form.checkOut} onChange={e => set('checkOut', e.target.value)} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Adults</Label><Input type="number" min="1" value={form.adults} onChange={e => set('adults', e.target.value)} /></div>
          <div><Label>Amount ($)</Label><Input type="number" value={form.baseAmount} onChange={e => set('baseAmount', e.target.value)} placeholder="500" /></div>
        </div>
        <div>
          <Label>Status</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
            {['PENDING', 'CONFIRMED', 'ARRIVING', 'CHECKED_IN', 'CHECKED_OUT'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Create Booking
        </Button>
      </form>
    </ModalShell>
  );
}

function generateInvoice(booking: any) {
  const g = booking.guest ?? {};
  const total = Number(booking.totalAmount ?? 0);
  const base = Number(booking.baseAmount ?? 0);
  const tax = Number(booking.taxAmount ?? 0);
  const paid = Number(booking.paidAmount ?? 0);
  const html = `<!doctype html><html><head><title>Invoice ${booking.referenceNumber}</title>
  <style>body{font-family:Arial,sans-serif;color:#0f172a;max-width:720px;margin:40px auto;padding:0 24px}
  h1{color:#0f766e;margin:0} .muted{color:#64748b;font-size:13px} table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0;font-size:14px} th{background:#f1f5f9}
  .right{text-align:right} .total{font-weight:bold;font-size:16px;color:#0f766e}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f766e;padding-bottom:16px}</style></head>
  <body>
    <div class="head"><div><h1>Silent Palms Villa</h1><p class="muted">Diani Beach, Kenya</p></div>
    <div class="right"><h2 style="margin:0">INVOICE</h2><p class="muted">${booking.referenceNumber}<br>${new Date().toLocaleDateString()}</p></div></div>
    <p style="margin-top:20px"><strong>Bill To:</strong><br>${g.firstName ?? ''} ${g.lastName ?? ''}<br>${g.phone ?? ''}<br>${g.email ?? ''}</p>
    <table>
      <tr><th>Description</th><th class="right">Details</th></tr>
      <tr><td>${booking.unit?.name ?? 'Accommodation'}</td><td class="right">${new Date(booking.checkIn).toLocaleDateString()} → ${new Date(booking.checkOut).toLocaleDateString()} (${booking.nights} nights)</td></tr>
      <tr><td>Accommodation</td><td class="right">$${base.toLocaleString()}</td></tr>
      <tr><td>Tax (16%)</td><td class="right">$${tax.toLocaleString()}</td></tr>
      <tr><td class="total">Total</td><td class="right total">${booking.currency ?? 'USD'} $${total.toLocaleString()}</td></tr>
      <tr><td>Paid</td><td class="right">$${paid.toLocaleString()}</td></tr>
      <tr><td><strong>Balance Due</strong></td><td class="right"><strong>$${(total - paid).toLocaleString()}</strong></td></tr>
    </table>
    <p class="muted" style="margin-top:32px">Thank you for choosing Silent Palms Villa. Karibu Diani! 🌴</p>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast.error('Allow pop-ups to generate the invoice');
}

function ViewBookingModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/confirm`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      r.data?.delivered ? toast.success('Confirmation sent via WhatsApp') : toast.warning(r.data?.note ?? 'Marked confirmed (WhatsApp not connected)', { duration: 6000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });
  const row = (label: string, value: any) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  );
  return (
    <ModalShell title={`Booking ${(booking.referenceNumber ?? '').slice(-8).toUpperCase()}`} onClose={onClose}>
      <div className="space-y-0.5">
        {row('Guest', `${booking.guest?.firstName ?? ''} ${booking.guest?.lastName ?? ''}`)}
        {row('Phone', booking.guest?.phone)}
        {row('Unit', booking.unit?.name)}
        {row('Channel', booking.channel)}
        {row('Status', booking.status)}
        {row('Check-in', booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : '—')}
        {row('Check-out', booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '—')}
        {row('Nights', booking.nights)}
        {row('Adults', booking.adults)}
        {row('Total', `$${Number(booking.totalAmount ?? 0).toLocaleString()}`)}
        {row('Paid', `$${Number(booking.paidAmount ?? 0).toLocaleString()}`)}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button variant="outline" onClick={() => generateInvoice(booking)}>Generate Invoice</Button>
        <Button className="bg-primary hover:bg-primary/90" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
          {confirm.isPending ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Send Confirmation
        </Button>
      </div>
    </ModalShell>
  );
}
