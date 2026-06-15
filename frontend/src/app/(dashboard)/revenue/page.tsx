'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Percent, Download, ArrowDownLeft, ArrowUpRight, Wallet, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { formatMoney, currencySymbol } from '@/lib/currency';

const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

export default function RevenuePage() {
  const [period, setPeriod] = useState('month');
  const { user } = useAuthStore();
  const role = (user as any)?.role?.name ?? (user as any)?.role ?? '';
  const canSeeFinance = FINANCE_ROLES.includes(role);

  const { data: summary } = useQuery({
    queryKey: ['revenue-summary', period],
    queryFn: () => api.get(`/revenue/summary?period=${period}`).then(r => r.data),
  });

  const { data: forecast } = useQuery({
    queryKey: ['revenue-forecast'],
    queryFn: () => api.get('/revenue/forecast').then(r => r.data),
  });

  const { data: cashflow } = useQuery({
    queryKey: ['cashflow', period],
    queryFn: () => api.get(`/revenue/cashflow?period=${period}`).then(r => r.data),
    enabled: canSeeFinance,
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
          <KpiCard title="Revenue" value={summary?.revenue ?? 0} prefix={`${currencySymbol()} `} icon={<DollarSign size={16} />} color="primary" />
          <KpiCard title="Expenses" value={summary?.expenses ?? 0} prefix={`${currencySymbol()} `} icon={<TrendingDown size={16} />} color="rose" />
          <KpiCard title="Profit" value={summary?.profit ?? 0} prefix={`${currencySymbol()} `} icon={<TrendingUp size={16} />} color="emerald" />
          <KpiCard title="ADR" value={summary?.adr ?? 0} prefix={`${currencySymbol()} `} icon={<BarChart2 size={16} />} color="secondary" />
          <KpiCard title="RevPAR" value={summary?.revpar ?? 0} prefix={`${currencySymbol()} `} icon={<BarChart2 size={16} />} color="accent" />
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
                    {item.value < 0 ? '-' : ''}{formatMoney(Math.abs(item.value))}
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

        {/* Finance: Cash Flow (restricted) */}
        {canSeeFinance ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                <h3 className="font-semibold">Cash Flow — Finance</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Restricted</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => generateFinanceReport(cashflow, period, 'expenses')}>
                  <FileText size={13} /> Expenses Report
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => generateFinanceReport(cashflow, period, 'cashflow')}>
                  <FileText size={13} /> Cash Flow Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><ArrowDownLeft size={15} /><span className="text-xs font-medium">Money In (Inflow)</span></div>
                <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{formatMoney(cashflow?.totalIn)}</p>
              </div>
              <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 p-4">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400"><ArrowUpRight size={15} /><span className="text-xs font-medium">Money Out (Outflow)</span></div>
                <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-400">{formatMoney(cashflow?.totalOut)}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary"><Wallet size={15} /><span className="text-xs font-medium">Net Position</span></div>
                <p className={`text-2xl font-bold mt-1 ${Number(cashflow?.net ?? 0) >= 0 ? 'text-primary' : 'text-rose-600'}`}>{formatMoney(cashflow?.net)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inflow by source</p>
                {(cashflow?.inflow ?? []).map((r: any) => (
                  <div key={r.category} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">{r.category}</span><span className="font-medium text-emerald-600">+{formatMoney(r.amount)}</span>
                  </div>
                ))}
                {(cashflow?.inflow ?? []).length === 0 && <p className="text-xs text-muted-foreground py-2">No income recorded this period.</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Outflow by category</p>
                {(cashflow?.outflow ?? []).map((r: any) => (
                  <div key={r.category} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">{r.category}</span><span className="font-medium text-rose-600">-{formatMoney(r.amount)}</span>
                  </div>
                ))}
                {(cashflow?.outflow ?? []).length === 0 && <p className="text-xs text-muted-foreground py-2">No expenses recorded this period.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Lock size={28} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Cash Flow is restricted</p>
            <p className="text-xs text-muted-foreground mt-1">Only Finance Managers and Admins can view inflow/outflow. Ask an admin to grant you the Finance Manager role.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function generateFinanceReport(cashflow: any, period: string, kind: 'expenses' | 'cashflow') {
  if (!cashflow) { toast.error('No data to export yet'); return; }
  const money = (n: number) => `${currencySymbol()} ${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '';
  const title = kind === 'expenses' ? 'Expenses Report' : 'Cash Flow Statement';
  const rows = kind === 'expenses'
    ? (cashflow.recentOutflow ?? []).map((e: any) => `<tr><td>${fmt(e.date)}</td><td>${e.category}</td><td>${e.vendor ?? ''}</td><td>${e.description ?? ''}</td><td class="right">${money(e.amount)}</td></tr>`).join('')
    : '';

  const inflowRows = (cashflow.inflow ?? []).map((r: any) => `<tr><td>${r.category}</td><td class="right" style="color:#047857">${money(r.amount)}</td></tr>`).join('');
  const outflowRows = (cashflow.outflow ?? []).map((r: any) => `<tr><td>${r.category}</td><td class="right" style="color:#b91c1c">${money(r.amount)}</td></tr>`).join('');

  const body = kind === 'expenses' ? `
    <h3>Expense Detail</h3>
    <table><thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Description</th><th class="right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><div class="grand"><span>Total Expenses</span><span>${money(cashflow.totalOut)}</span></div></div>
  ` : `
    <h3>Inflow (Money In)</h3>
    <table><thead><tr><th>Source / Category</th><th class="right">Amount</th></tr></thead><tbody>${inflowRows}</tbody></table>
    <h3 style="margin-top:24px">Outflow (Money Out)</h3>
    <table><thead><tr><th>Category</th><th class="right">Amount</th></tr></thead><tbody>${outflowRows}</tbody></table>
    <div class="totals">
      <div><span>Total Inflow</span><span style="color:#047857">${money(cashflow.totalIn)}</span></div>
      <div><span>Total Outflow</span><span style="color:#b91c1c">${money(cashflow.totalOut)}</span></div>
      <div class="grand"><span>Net Position</span><span>${money(cashflow.net)}</span></div>
    </div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:'Book Antiqua','Palatino Linotype',Georgia,serif;color:#1f2937;max-width:760px;margin:0 auto;padding:48px 40px}
  .brand{font-size:24px;font-weight:bold;color:#0f766e} .muted{color:#6b7280;font-size:13px}
  h3{color:#0f766e;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px} th{background:#0f766e;color:#fff;text-align:left;padding:8px 10px;font-weight:normal}
  td{padding:8px 10px;border-bottom:1px solid #e5e7eb} .right{text-align:right}
  .totals{margin-top:14px;margin-left:auto;width:320px;font-size:14px} .totals div{display:flex;justify-content:space-between;padding:5px 0}
  .totals .grand{border-top:2px solid #0f766e;margin-top:6px;padding-top:10px;font-size:16px;font-weight:bold;color:#0f766e}</style></head>
  <body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #0f766e;padding-bottom:14px">
      <div><div class="brand">Silent Palms Villa</div><div class="muted">Diani Beach, Kenya</div></div>
      <div style="text-align:right"><div style="font-size:18px;letter-spacing:2px;color:#0f766e">${title.toUpperCase()}</div>
      <div class="muted">Period: ${period === 'year' ? 'This Year' : 'This Month'}<br>Generated: ${new Date().toLocaleDateString('en-GB')}</div></div>
    </div>
    ${body}
    <p class="muted" style="margin-top:32px;text-align:center">Confidential — Silent Palms Villa finance report.</p>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast.error('Allow pop-ups to generate the report');
}
