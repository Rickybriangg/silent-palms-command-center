'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Percent, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function RevenuePage() {
  const [period, setPeriod] = useState('month');

  const { data: summary } = useQuery({
    queryKey: ['revenue-summary', period],
    queryFn: () => api.get(`/revenue/summary?period=${period}`).then(r => r.data),
  });

  const { data: forecast } = useQuery({
    queryKey: ['revenue-forecast'],
    queryFn: () => api.get('/revenue/forecast').then(r => r.data),
  });

  const handleExport = async (type: string) => {
    const res = await api.post(`/documents/excel/${type}`, {}, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.xlsx`;
    a.click();
    toast.success('Report downloaded');
  };

  return (
    <div>
      <Header title="Revenue Center" subtitle="Financial performance & forecasting" />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport('revenue')}>
              <Download size={14} /> Revenue Report
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport('bookings')}>
              <Download size={14} /> Bookings Report
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Revenue" value={summary?.revenue ?? 0} prefix="$" icon={<DollarSign size={16} />} color="primary" />
          <KpiCard title="Expenses" value={summary?.expenses ?? 0} prefix="$" icon={<TrendingDown size={16} />} color="rose" />
          <KpiCard title="Profit" value={summary?.profit ?? 0} prefix="$" icon={<TrendingUp size={16} />} color="emerald" />
          <KpiCard title="ADR" value={summary?.adr ?? 0} prefix="$" icon={<BarChart2 size={16} />} color="secondary" />
          <KpiCard title="RevPAR" value={summary?.revpar ?? 0} prefix="$" icon={<BarChart2 size={16} />} color="accent" />
          <KpiCard title="ROI" value={summary?.roi ?? 0} suffix="%" icon={<Percent size={16} />} color="blue" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-1">Revenue Forecast</h3>
            <p className="text-xs text-muted-foreground mb-4">3-month projection based on historical trends</p>
            {forecast && (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Avg growth rate: <span className="font-medium text-foreground">{forecast.avgGrowthRate}%</span>
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={forecast.forecast}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, 'Forecast']}
                    />
                    <Bar dataKey="forecast" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* P&L Summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">P&L Summary</h3>
            <div className="space-y-4">
              {[
                { label: 'Total Revenue', value: summary?.revenue ?? 0, color: 'text-emerald-600' },
                { label: 'Total Expenses', value: -(summary?.expenses ?? 0), color: 'text-rose-600' },
                { label: 'Net Profit', value: summary?.profit ?? 0, color: 'text-primary font-bold' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm ${item.color}`}>
                    {item.value < 0 ? '-' : ''}${Math.abs(item.value).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Occupancy Rate</span>
                <span className="text-sm font-bold text-primary">{summary?.occupancy ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
