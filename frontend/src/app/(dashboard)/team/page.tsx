'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, CheckCircle2, XCircle, UserPlus, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-primary/10 text-primary',
  MARKETING_ADMIN: 'bg-purple-100 text-purple-700',
  GUEST_RELATIONS: 'bg-blue-100 text-blue-700',
  PROPERTY_MANAGER: 'bg-amber-100 text-amber-700',
  FINANCE_MANAGER: 'bg-emerald-100 text-emerald-700',
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [joinInfo, setJoinInfo] = useState<{ name: string; email: string; code: string } | null>(null);
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/users/roles').then(r => r.data) });

  const addStaff = useMutation({
    mutationFn: (data: any) => api.post('/auth/register', data),
    onSuccess: (res, vars: any) => {
      qc.invalidateQueries({ queryKey: ['team'] });
      setShowAdd(false);
      if (res.data?.joinCode) setJoinInfo({ name: `${vars.firstName} ${vars.lastName}`, email: vars.email, code: res.data.joinCode });
      else toast.success('Staff member added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to add staff'),
  });
  const updateStaff = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Staff updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Update failed'),
  });
  const removeStaff = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Staff removed'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Remove failed'),
  });

  return (
    <div>
      <Header title="Team" subtitle="Staff, roles & access" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{members.length} team member{members.length === 1 ? '' : 's'}</p>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowAdd(true)}><UserPlus size={14} /> Add Staff</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m: any) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{m.firstName} {m.lastName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role?.name] ?? 'bg-muted text-muted-foreground'}`}>
                      {m.role?.name?.replace(/_/g, ' ') ?? 'No role'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail size={12} /> <span className="truncate">{m.email}</span></div>
                  {m.phone && <div className="flex items-center gap-2"><Phone size={12} /> {m.phone}</div>}
                  <div className="flex items-center gap-2">
                    {m.isActive
                      ? <><CheckCircle2 size={12} className="text-emerald-500" /> Active</>
                      : <><XCircle size={12} className="text-red-500" /> Inactive</>}
                  </div>
                </div>

                {/* Manage rights (admin) */}
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Role / rights</label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-0.5"
                      value={roles.find((r: any) => r.name === m.role?.name)?.id ?? ''}
                      onChange={e => updateStaff.mutate({ id: m.id, data: { roleId: e.target.value } })}
                    >
                      {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]"
                      onClick={() => updateStaff.mutate({ id: m.id, data: { isActive: !m.isActive } })}>
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] text-red-600 hover:text-red-700 gap-1"
                      onClick={() => { if (confirm(`Remove ${m.firstName} ${m.lastName}?`)) removeStaff.mutate(m.id); }}>
                      <Trash2 size={12} /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onSubmit={(d) => addStaff.mutate(d)} loading={addStaff.isPending} />}

      {joinInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setJoinInfo(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl w-full max-w-sm p-6 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
            <h3 className="font-semibold">{joinInfo.name} invited</h3>
            <p className="text-xs text-muted-foreground mt-1">Share this 6-digit join code with them. They go to the <strong>/join</strong> page, enter their email + code, and set their password to activate their account.</p>
            <div className="my-4 py-3 rounded-lg bg-primary/10 text-primary text-3xl font-bold tracking-[0.4em]">{joinInfo.code}</div>
            <p className="text-xs text-muted-foreground">Email: {joinInfo.email}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(joinInfo.code); toast.success('Code copied'); }}>Copy Code</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setJoinInfo(null)}>Done</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AddStaffModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/users/roles').then(r => r.data) });
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', roleId: '', position: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Add Staff Member</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">They&apos;ll receive a 6-digit code to verify their email and set their own password at the <strong>/join</strong> page.</p>
        <form onSubmit={e => {
          e.preventDefault();
          if (!form.firstName || !form.lastName) return toast.error('Name is required');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Valid email required');
          if (!form.roleId) return toast.error('Select a role');
          // No password — backend issues a join code.
          onSubmit({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, roleId: form.roleId });
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
            <div><Label>Last name</Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="staff@silentpalms.com" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254…" /></div>
            <div><Label>Position / title</Label><Input value={form.position} onChange={e => set('position', e.target.value)} placeholder="Housekeeper" /></div>
          </div>
          <div>
            <Label>Role & rights</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.roleId} onChange={e => set('roleId', e.target.value)} required>
              <option value="">Select a role…</option>
              {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Finance Manager can view cash flow; only Super Admin manages staff & rights.</p>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Generate Join Code
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
