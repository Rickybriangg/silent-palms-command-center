'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Play, Pause, Plus, ChevronRight, Clock, BarChart2 } from 'lucide-react';
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

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/automation').then(r => r.data),
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
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
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
                  <button
                    onClick={() => toggleMutation.mutate(w.id)}
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
    </div>
  );
}
