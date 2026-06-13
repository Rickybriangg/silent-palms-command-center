'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';

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

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', search, status, channel],
    queryFn: () => api.get(`/bookings?search=${search}&status=${status}&channel=${channel}`).then(r => r.data),
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
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
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
                      <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
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
    </div>
  );
}
