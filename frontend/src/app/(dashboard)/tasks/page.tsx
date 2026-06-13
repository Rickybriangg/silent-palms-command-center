'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckSquare, Clock, AlertCircle, User } from 'lucide-react';
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
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
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
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
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
    </div>
  );
}
