'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0F766E', '#14B8A6', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];

interface Props { data: { channel: string; bookings?: number; revenue?: number }[] }

export function ChannelBreakdown({ data }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-1">Booking Channels</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribution this month</p>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="bookings" nameKey="channel" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-2 mt-4">
        {data.map((d, i) => (
          <div key={d.channel} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{d.channel}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{d.bookings ?? 0} bookings</span>
              <span className="text-muted-foreground">${(d.revenue ?? 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
