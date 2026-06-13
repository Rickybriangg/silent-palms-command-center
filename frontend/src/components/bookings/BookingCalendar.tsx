'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_BG: Record<string, string> = {
  CONFIRMED: 'bg-blue-500',
  CHECKED_IN: 'bg-emerald-500',
  CHECKED_OUT: 'bg-slate-400',
  ARRIVING: 'bg-purple-500',
  PENDING: 'bg-amber-500',
};

export function BookingCalendar() {
  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-calendar', month, year],
    queryFn: () => api.get(`/bookings/calendar?month=${month}&year=${year}`).then(r => r.data),
  });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const getBookingsForDay = (day: number) => {
    const d = new Date(year, month - 1, day);
    return bookings.filter((b: any) => {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      return d >= checkIn && d < checkOut;
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
            <ChevronLeft size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayBookings = getBookingsForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === month - 1 && new Date().getFullYear() === year;
          return (
            <div
              key={day}
              className={cn(
                'min-h-[80px] p-1.5 rounded-lg border transition-colors',
                isToday ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
              )}
            >
              <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-foreground')}>{day}</span>
              <div className="mt-1 space-y-0.5">
                {dayBookings.slice(0, 2).map((b: any) => (
                  <div
                    key={b.id}
                    className={cn('text-[9px] text-white px-1 py-0.5 rounded truncate', STATUS_BG[b.status] ?? 'bg-gray-500')}
                    title={`${b.guest?.firstName} ${b.guest?.lastName}`}
                  >
                    {b.guest?.firstName}
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{dayBookings.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
