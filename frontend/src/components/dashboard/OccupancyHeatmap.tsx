'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function OccupancyHeatmap() {
  const { data: heatmap = {} } = useQuery({
    queryKey: ['occupancy-heatmap'],
    queryFn: () => api.get('/dashboard/occupancy-heatmap').then(r => r.data),
  });

  const now = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    return d.toISOString().slice(0, 10);
  });

  const maxVal = Math.max(...Object.values(heatmap as Record<string, number>), 1);

  const intensity = (val: number) => {
    const pct = val / maxVal;
    if (pct === 0) return 'bg-muted';
    if (pct < 0.33) return 'bg-teal-200 dark:bg-teal-900';
    if (pct < 0.66) return 'bg-teal-400 dark:bg-teal-700';
    return 'bg-primary';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-1">Occupancy Heatmap</h3>
      <p className="text-xs text-muted-foreground mb-4">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>

      <div className="grid grid-cols-10 gap-1">
        {days.map(day => {
          const count = (heatmap as Record<string, number>)[day] ?? 0;
          return (
            <div
              key={day}
              title={`${day}: ${count} bookings`}
              className={cn('h-8 rounded cursor-pointer transition-opacity hover:opacity-80', intensity(count))}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Low</span>
        {['bg-muted', 'bg-teal-200', 'bg-teal-400', 'bg-primary'].map((c, i) => (
          <div key={i} className={cn('w-5 h-3 rounded', c)} />
        ))}
        <span className="text-xs text-muted-foreground">High</span>
      </div>
    </div>
  );
}
