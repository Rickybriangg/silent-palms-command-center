'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const periods = ['3months', '6months', '12months'];

export function RevenueChart() {
  const [period, setPeriod] = useState('12months');

  const { data = [] } = useQuery({
    queryKey: ['revenue-chart', period],
    queryFn: () => api.get(`/dashboard/revenue-chart?period=${period}`).then(r => r.data),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-xs text-muted-foreground">Revenue, Expenses & Profit</p>
        </div>
        <div className="flex gap-1">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                period === p ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {p.replace('months', 'M')}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F766E" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="revenue" stroke="#0F766E" strokeWidth={2} fill="url(#revenue)" name="Revenue" />
          <Area type="monotone" dataKey="expenses" stroke="#F59E0B" strokeWidth={2} fill="transparent" strokeDasharray="4 4" name="Expenses" />
          <Area type="monotone" dataKey="profit" stroke="#14B8A6" strokeWidth={2} fill="url(#profit)" name="Profit" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
