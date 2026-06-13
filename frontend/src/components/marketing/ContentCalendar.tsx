'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLATFORM_BG: Record<string, string> = {
  INSTAGRAM: 'bg-pink-500',
  FACEBOOK: 'bg-blue-600',
  TIKTOK: 'bg-black',
  GOOGLE_BUSINESS: 'bg-yellow-500',
  TWITTER: 'bg-sky-500',
};

export function ContentCalendar() {
  const [date, setDate] = useState(new Date());
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const { data: posts = [] } = useQuery({
    queryKey: ['content-calendar', month, year],
    queryFn: () => api.get(`/marketing/calendar?month=${month}&year=${year}`).then(r => r.data),
  });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const getPostsForDay = (day: number) =>
    posts.filter((p: any) => {
      const d = new Date(p.scheduledAt);
      return d.getDate() === day && d.getMonth() === month - 1 && d.getFullYear() === year;
    });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
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

      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayPosts = getPostsForDay(day);
          const isToday = new Date().toDateString() === new Date(year, month - 1, day).toDateString();
          return (
            <div
              key={day}
              className={cn('min-h-[90px] p-1.5 rounded-lg border', isToday ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30')}
            >
              <span className={cn('text-xs font-medium block mb-1', isToday ? 'text-primary' : '')}>{day}</span>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p: any) => (
                  <div key={p.id} className={cn('text-[9px] text-white px-1 py-0.5 rounded truncate', PLATFORM_BG[p.platform] ?? 'bg-primary')}>
                    {p.title || p.platform}
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
