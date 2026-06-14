'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownLeft, ArrowUpRight, Wallet, ClipboardCheck, Tags, ShieldCheck, History, Plus, X, Loader2, Lock, Check, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

const FINANCE_ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER'];
const TABS = [
  { key: 'overview', label: 'Overview', icon: Wallet },
  { key: 'approvals', label: 'Expenses & Approvals', icon: ClipboardCheck },
  { key: 'budgets', label: 'Budgets', icon: Tags },
  { key: 'access', label: 'Staff Access', icon: ShieldCheck, adminOnly: true },
  { key: 'audit', label: 'Audit Trail', icon: History },
];

export default function FinancePage() {
  const { user } = useAuthStore();
  const role = (user as any)?.role?.name ?? (user as any)?.role ?? '';
  const isFinance = FINANCE_ROLES.includes(role);
  const isAdmin = role === 'SUPER_ADMIN';
  const [tab, setTab] = useState('overview');

  if (!isFinance) {
    return (
      <div>
        <Header title="Finance" subtitle="Inflow, outflow, approvals & access control" />
        <div className="p-6"><div className="bg-card border border-border rounded-xl p-10 text-center">
          <Lock size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">Finance is restricted</p>
          <p className="text-sm text-muted-foreground mt-1">Only Finance Managers and Admins can access this module. Ask an admin for the Finance Manager role.</p>
        </div></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Finance Dashboard" subtitle="Inflow, outflow, approvals & staff access" />
      <div className="p-6 space-y-5">
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit overflow-x-auto">
          {TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors', tab === t.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground')}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview />}
        {tab === 'approvals' && <Approvals />}
        {tab === 'budgets' && <Budgets />}
        {tab === 'access' && isAdmin && <StaffAccess />}
        {tab === 'audit' && <AuditTrail />}
      </div>
    </div>
  );
}

function Overview() {
  const { data } = useQuery({ queryKey: ['finance-overview'], queryFn: () => api.get('/finance/overview').then(r => r.data) });
  const money = (n: number) => `$${Number(n ?? 0).toLocaleString()}`;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><ArrowDownLeft size={15} /><span className="text-xs font-medium">Inflow (Month)</span></div>
          <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{money(data?.totalIn)}</p>
        </Card>
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400"><ArrowUpRight size={15} /><span className="text-xs font-medium">Outflow (Month)</span></div>
          <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-400">{money(data?.totalOut)}</p>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-primary"><Wallet size={15} /><span className="text-xs font-medium">Net Position</span></div>
          <p className={cn('text-2xl font-bold mt-1', Number(data?.net ?? 0) >= 0 ? 'text-primary' : 'text-rose-600')}>{money(data?.net)}</p>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><ClipboardCheck size={15} /><span className="text-xs font-medium">Pending Approvals</span></div>
          <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-400">{data?.pendingApprovals ?? 0}</p>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Budget vs Actual (This Month)</h3>
        {(data?.budgets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No budget categories yet — add some in the Budgets tab.</p>
        ) : (
          <div className="space-y-3">
            {(data?.budgets ?? []).map((b: any) => {
              const pct = b.budget > 0 ? Math.min(100, (b.spent / b.budget) * 100) : 0;
              const over = b.budget > 0 && b.spent > b.budget;
              return (
                <div key={b.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{b.category}</span>
                    <span className={cn(over ? 'text-rose-600' : 'text-muted-foreground')}>{money(b.spent)} / {money(b.budget)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', over ? 'bg-rose-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Approvals() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: expenses = [] } = useQuery({ queryKey: ['finance-expenses'], queryFn: () => api.get('/finance/expenses').then(r => r.data) });
  const { data: cats = [] } = useQuery({ queryKey: ['finance-categories'], queryFn: () => api.get('/finance/categories').then(r => r.data) });

  const submit = useMutation({
    mutationFn: (d: any) => api.post('/finance/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-expenses'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); toast.success('Expense submitted for approval'); setShowNew(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) => api.post(`/finance/expenses/${id}/decide`, { decision }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-expenses'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); toast.success('Decision recorded'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });

  const STATUS = { PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-rose-100 text-rose-700' } as Record<string, string>;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Expense Approvals</h3>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowNew(true)}><Plus size={14} /> Submit Expense</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border text-xs text-muted-foreground">
          <th className="text-left py-2">Date</th><th className="text-left">Category</th><th className="text-left">Vendor</th><th className="text-right">Amount</th><th className="text-center">Status</th><th></th>
        </tr></thead>
        <tbody>
          {expenses.map((e: any) => (
            <tr key={e.id} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
              <td>{e.category}</td>
              <td className="text-muted-foreground">{e.vendor ?? '—'}</td>
              <td className="text-right font-medium">${Number(e.amount).toLocaleString()}</td>
              <td className="text-center"><span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS[e.status])}>{e.status}</span></td>
              <td className="text-right">
                {e.status === 'PENDING' && (
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => decide.mutate({ id: e.id, decision: 'APPROVED' })}><Check size={14} /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" onClick={() => decide.mutate({ id: e.id, decision: 'REJECTED' })}><Ban size={14} /></Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">No expenses yet.</td></tr>}
        </tbody>
      </table>

      {showNew && <ExpenseModal cats={cats} onClose={() => setShowNew(false)} onSubmit={(d) => submit.mutate(d)} loading={submit.isPending} />}
    </div>
  );
}

function ExpenseModal({ cats, onClose, onSubmit, loading }: { cats: any[]; onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ category: cats[0]?.name ?? '', amount: '', vendor: '', description: '', date: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Submit Expense" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!form.category || !form.amount) return toast.error('Category and amount required'); onSubmit({ ...form, amount: Number(form.amount) }); }} className="space-y-3">
        <div>
          <Label>Category</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
            {cats.length === 0 && <option value="">(add categories first)</option>}
            {cats.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
        </div>
        <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Coastal Pool Services" /></div>
        <div><Label>Description</Label><Input value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>{loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Submit for Approval</Button>
      </form>
    </Modal>
  );
}

function Budgets() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ['finance-categories'], queryFn: () => api.get('/finance/categories').then(r => r.data) });
  const [form, setForm] = useState({ name: '', monthlyBudget: '' });
  const create = useMutation({
    mutationFn: (d: any) => api.post('/finance/categories', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-categories'] }); qc.invalidateQueries({ queryKey: ['finance-overview'] }); toast.success('Category added'); setForm({ name: '', monthlyBudget: '' }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
  });
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold mb-4">Expense Categories & Monthly Budgets</h3>
      <form onSubmit={e => { e.preventDefault(); if (!form.name) return toast.error('Name required'); create.mutate({ name: form.name, monthlyBudget: Number(form.monthlyBudget || 0) }); }} className="flex gap-2 mb-4">
        <Input placeholder="Category name (e.g. Utilities)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="flex-1" />
        <Input type="number" placeholder="Monthly budget $" value={form.monthlyBudget} onChange={e => setForm(f => ({ ...f, monthlyBudget: e.target.value }))} className="w-40" />
        <Button type="submit" className="bg-primary hover:bg-primary/90 gap-1" disabled={create.isPending}><Plus size={14} /> Add</Button>
      </form>
      <div className="divide-y divide-border/50">
        {cats.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="text-muted-foreground">Budget: ${Number(c.monthlyBudget).toLocaleString()}/mo</span>
          </div>
        ))}
        {cats.length === 0 && <p className="py-6 text-center text-muted-foreground text-sm">No categories yet.</p>}
      </div>
    </div>
  );
}

function StaffAccess() {
  const qc = useQueryClient();
  const { data: staff = [] } = useQuery({ queryKey: ['team'], queryFn: () => api.get('/users').then(r => r.data) });
  const { data: restData } = useQuery({ queryKey: ['finance-restrictions'], queryFn: () => api.get('/finance/restrictions').then(r => r.data) });
  const keys: string[] = restData?.keys ?? [];
  const restrictions: any[] = restData?.restrictions ?? [];
  const KEY_LABELS: Record<string, string> = { NO_FINANCE_VIEW: 'Block Finance access', NO_EXPENSE_APPROVE: 'Block expense approvals', NO_EXPORT: 'Block report exports', NO_DELETE: 'Block deletions', NO_STAFF_MANAGE: 'Block staff management' };

  const toggle = useMutation({
    mutationFn: ({ userId, key, on }: { userId: string; key: string; on: boolean }) =>
      on ? api.post('/finance/restrictions', { userId, key }) : api.delete('/finance/restrictions', { data: { userId, key } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-restrictions'] }); toast.success('Access updated'); },
    onError: () => toast.error('Failed'),
  });
  const isRestricted = (userId: string, key: string) => restrictions.some(r => r.userId === userId && r.key === key);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold mb-1">Staff Access Restrictions</h3>
      <p className="text-xs text-muted-foreground mb-4">Restrict specific capabilities per staff member — overrides their role permissions. (Admin only.)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left py-2">Staff</th>
            {keys.map(k => <th key={k} className="text-center px-2 font-medium">{KEY_LABELS[k] ?? k}</th>)}
          </tr></thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="py-2"><span className="font-medium">{s.firstName} {s.lastName}</span><span className="block text-[10px] text-muted-foreground">{s.role?.name}</span></td>
                {keys.map(k => (
                  <td key={k} className="text-center px-2">
                    <input type="checkbox" checked={isRestricted(s.id, k)} onChange={e => toggle.mutate({ userId: s.id, key: k, on: e.target.checked })} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTrail() {
  const { data: logs = [] } = useQuery({ queryKey: ['finance-audit'], queryFn: () => api.get('/finance/audit').then(r => r.data) });
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold mb-4">Finance Activity Log</h3>
      <div className="divide-y divide-border/50">
        {logs.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <span className="font-medium">{l.action}</span> <span className="text-muted-foreground">{l.entity}</span>
              {l.user && <span className="text-xs text-muted-foreground"> · by {l.user.firstName} {l.user.lastName}</span>}
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="py-6 text-center text-muted-foreground text-sm">No activity yet.</p>}
      </div>
    </div>
  );
}

// shared bits
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border p-4', className)}>{children}</div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">{title}</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button></div>
        {children}
      </motion.div>
    </div>
  );
}
