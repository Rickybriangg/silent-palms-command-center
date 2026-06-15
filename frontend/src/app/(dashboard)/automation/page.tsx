'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Plus, ChevronRight, Clock, BarChart2, X, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const TRIGGER_LABELS: Record<string, string> = {
  BOOKING_CREATED: '📅 New Booking',
  DAY_BEFORE_ARRIVAL: '🏖️ Day Before Arrival',
  CHECK_IN_PLUS_2H: '✅ 2h After Check-In',
  MID_STAY: '🌴 Mid Stay',
  CHECKOUT_DAY: '👋 Checkout Day',
  AFTER_CHECKOUT: '⭐ After Checkout',
};

const ACTION_ICONS: Record<string, string> = {
  SEND_WHATSAPP: '💬',
  CREATE_GUEST: '👤',
  UPDATE_REVENUE: '💰',
  NOTIFY_TEAM: '🔔',
  SCHEDULE_REVIEW: '⭐',
};

export default function AutomationPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [runResult, setRunResult] = useState<any | null>(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/automation').then(r => r.data),
  });

  const createWorkflow = useMutation({
    mutationFn: (data: any) => api.post('/automation', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); setShowNew(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create workflow'),
  });

  const runMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.post(`/automation/${id}/run`).then(r => ({ ...r.data, name })),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['workflows'] }); setRunResult(data); toast.success(data?.message ?? 'Workflow ran'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to run workflow'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automation/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow updated'); },
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/automation/seed-defaults'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Default workflows created'); },
  });

  return (
    <div>
      <Header title="Automation Builder" subtitle="Visual workflow automation engine" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{workflows.length} workflows configured</p>
          <div className="flex gap-2">
            {workflows.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                Load Default Workflows
              </Button>
            )}
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowNew(true)}>
              <Plus size={14} /> New Workflow
            </Button>
          </div>
        </div>

        {/* Workflow Cards */}
        <div className="grid gap-4">
          {workflows.map((w: any, i: number) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0', w.isActive ? 'bg-primary' : 'bg-muted')}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{w.name}</h4>
                    {w.description && <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <BarChart2 size={12} /> {w.runCount} runs
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={runMutation.isPending} onClick={() => runMutation.mutate({ id: w.id, name: w.name })}>
                    <Play size={11} /> Run
                  </Button>
                  <button
                    onClick={() => toggleMutation.mutate(w.id)}
                    title={w.isActive ? 'Active' : 'Paused'}
                    className={cn('relative w-10 h-5 rounded-full transition-colors', w.isActive ? 'bg-primary' : 'bg-muted')}
                  >
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', w.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </div>
              </div>

              {/* Flow visualization */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Trigger */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">TRIGGER</span>
                  <span className="text-xs text-amber-600 dark:text-amber-500">
                    {(() => { try { const t = typeof w.trigger === 'string' ? JSON.parse(w.trigger) : w.trigger; return TRIGGER_LABELS[t?.event] ?? t?.event; } catch { return String(w.trigger); } })()}
                  </span>
                </div>

                {((): any[] => { try { return typeof w.actions === 'string' ? JSON.parse(w.actions) : (w.actions ?? []); } catch { return []; } })().map((action: any, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <span>{ACTION_ICONS[action.type] ?? '⚡'}</span>
                      <span className="text-xs font-medium text-primary">{action.type?.replace(/_/g, ' ')}</span>
                      {action.config?.template && (
                        <span className="text-xs text-muted-foreground">/{action.config.template}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {w.lastRunAt && (
                <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                  <Clock size={10} /> Last run: {new Date(w.lastRunAt).toLocaleString()}
                </p>
              )}
            </motion.div>
          ))}

          {workflows.length === 0 && (
            <div className="py-20 text-center">
              <Zap size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No workflows yet</p>
              <p className="text-xs text-muted-foreground mt-1">Load defaults or create a custom workflow</p>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewWorkflowModal onClose={() => setShowNew(false)} onSubmit={(d) => createWorkflow.mutate(d)} loading={createWorkflow.isPending} />}

      {runResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRunResult(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold flex items-center gap-2"><Zap size={16} className="text-primary" /> {runResult.name}</h3>
              <button onClick={() => setRunResult(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Trigger <span className="font-medium text-foreground">{TRIGGER_LABELS[runResult.trigger] ?? runResult.trigger}</span> · {runResult.clientsProcessed} client(s) processed
            </p>
            {(runResult.results ?? []).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No clients currently match this trigger. Try the "New Booking" trigger, or add bookings in the matching window.</div>
            ) : (
              <div className="space-y-2">
                {(runResult.results ?? []).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {r.client?.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.client}</p>
                        <p className="text-[10px] text-muted-foreground">{r.reference}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{r.stage}</span>
                      <p className="text-[11px] text-emerald-600 mt-0.5">✓ {r.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-4" variant="outline" onClick={() => setRunResult(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function NewWorkflowModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', description: '', trigger: 'BOOKING_CREATED', action: 'SEND_WHATSAPP', template: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">New Workflow</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          if (!form.name) return toast.error('Name is required');
          onSubmit({
            name: form.name,
            description: form.description || null,
            trigger: JSON.stringify({ event: form.trigger }),
            actions: JSON.stringify([{ type: form.action, config: form.template ? { template: form.template } : {} }]),
            isActive: true,
          });
        }} className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Pre-arrival reminder" required /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} /></div>
          <div>
            <Label>When (trigger)</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.trigger} onChange={e => set('trigger', e.target.value)}>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Then (action)</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.action} onChange={e => set('action', e.target.value)}>
              {Object.keys(ACTION_ICONS).map(k => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {form.action === 'SEND_WHATSAPP' && (
            <div><Label>Template slug (optional)</Label><Input value={form.template} onChange={e => set('template', e.target.value)} placeholder="enquiry" /></div>
          )}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Create Workflow
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
