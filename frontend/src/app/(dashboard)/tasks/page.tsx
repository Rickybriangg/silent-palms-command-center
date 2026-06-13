'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckSquare, Clock, AlertCircle, User, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const STATUS_COLS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_LABELS: Record<string, string> = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'Review', DONE: 'Done' };
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',
  URGENT: 'text-red-500',
};

export default function TasksPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task created'); setShowNew(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create task'),
  });

  const groupedTasks = STATUS_COLS.reduce((acc, status) => {
    acc[status] = tasks.filter((t: any) => t.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <Header title="Task Management" subtitle="Team assignments, progress & deadlines" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{tasks.length} total tasks</p>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Task
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 overflow-x-auto">
          {STATUS_COLS.map(status => (
            <div key={status} className="min-w-[240px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{STATUS_LABELS[status]}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{groupedTasks[status]?.length ?? 0}</span>
              </div>

              <div className="space-y-2">
                {groupedTasks[status]?.map((task: any) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <AlertCircle size={13} className={cn('shrink-0 mt-0.5', PRIORITY_COLOR[task.priority])} />
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                            {task.assignee.firstName?.[0]}
                          </div>
                          <span className="text-xs text-muted-foreground">{task.assignee.firstName}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={9} />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {status !== 'DONE' && (
                      <div className="flex gap-1 mt-2">
                        {STATUS_COLS.filter(s => s !== status).slice(0, 2).map(s => (
                          <button
                            key={s}
                            onClick={() => updateMutation.mutate({ id: task.id, data: { status: s } })}
                            className="text-[9px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            → {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && <NewTaskModal onClose={() => setShowNew(false)} onSubmit={(d) => createTask.mutate(d)} loading={createTask.isPending} />}
    </div>
  );
}

function NewTaskModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const { data: team = [] } = useQuery({ queryKey: ['team-for-task'], queryFn: () => api.get('/users').then(r => r.data) });
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assigneeId: '', dueDate: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">New Task</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.title) return toast.error('Title is required'); onSubmit({ ...form, assigneeId: form.assigneeId || null, dueDate: form.dueDate || null }); }} className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Prepare villa for check-in" required /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Column</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Assignee</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)}>
              <option value="">Unassigned</option>
              {team.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Create Task
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
