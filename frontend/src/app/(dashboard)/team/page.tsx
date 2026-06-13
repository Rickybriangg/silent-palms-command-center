'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, CheckCircle2, XCircle, UserPlus, X, Loader2 } from 'lucide-react';
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
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const addStaff = useMutation({
    mutationFn: (data: any) => api.post('/auth/register', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast.success('Staff member added'); setShowAdd(false); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to add staff'),
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
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onSubmit={(d) => addStaff.mutate(d)} loading={addStaff.isPending} />}
    </div>
  );
}

function AddStaffModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => void; loading: boolean }) {
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/users/roles').then(r => r.data) });
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Add Staff Member</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          if (!form.firstName || !form.lastName) return toast.error('Name is required');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Valid email required');
          if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
          if (!form.roleId) return toast.error('Select a role');
          onSubmit(form);
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
            <div><Label>Last name</Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="staff@silentpalms.com" required /></div>
          <div><Label>Temporary password</Label><Input type="text" value={form.password} onChange={e => set('password', e.target.value)} placeholder="min 8 characters" required /></div>
          <div>
            <Label>Role</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.roleId} onChange={e => set('roleId', e.target.value)} required>
              <option value="">Select a role…</option>
              {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : null} Add Staff
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
