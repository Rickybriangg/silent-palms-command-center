'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function BookingFunnel() {
  const { data = [] } = useQuery({
    queryKey: ['booking-funnel'],
    queryFn: () => api.get('/analytics/booking-funnel').then(r => r.data),
  });

  const colors = ['#0F766E', '#14B8A6', '#F59E0B', '#3B82F6'];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-1">Booking Funnel</h3>
      <p className="text-xs text-muted-foreground mb-4">Conversion stages</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={120} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, _n: string, p: any) => [`${v} (${p.payload.percentage}%)`, p.payload.stage]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
